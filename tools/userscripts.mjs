import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const rawBase = 'https://raw.githubusercontent.com/kaokei/userscripts/main/';
const catalogStart = '<!-- 脚本目录开始 -->';
const catalogEnd = '<!-- 脚本目录结束 -->';

async function listScripts(directory) {
    const paths = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) paths.push(...await listScripts(path));
        else if (entry.isFile() && entry.name.endsWith('.user.js')) paths.push(path);
    }
    return paths.sort();
}

async function saveGenerated(path, expected) {
    if (!checkOnly) {
        await writeFile(path, expected);
        return;
    }
    const actual = await readFile(path, 'utf8').catch((error) => {
        if (error.code === 'ENOENT') return null;
        throw error;
    });
    if (actual !== expected) throw new Error(`${relative(root, path)} 需要更新，请运行 npm run build。`);
}

function tableText(value) {
    return value.replaceAll('|', '&#124;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

try {
    const paths = await listScripts(resolve(root, 'scripts'));
    if (!paths.length) throw new Error('scripts/ 中没有可发布的 .user.js 脚本。');
    const identities = new Set();
    const rows = [];
    for (const path of paths) {
        const source = await readFile(path, 'utf8');
        const header = source.match(/^\/\/ ==UserScript==\r?\n[\s\S]*?^\/\/ ==\/UserScript==[ \t]*(?:\r?\n|$)/m);
        if (!header || header.index !== 0) throw new Error(`${basename(path)} 缺少开头的脚本元数据。`);
        const fields = new Map();
        for (const [, key, value] of header[0].matchAll(/^\/\/\s+@(\S+)[ \t]*(.*)$/gm)) {
            const values = fields.get(key) ?? [];
            values.push(value.trim());
            fields.set(key, values);
        }
        for (const key of ['name', 'namespace', 'version', 'description', 'updateURL', 'downloadURL']) {
            if (fields.get(key)?.length !== 1 || !fields.get(key)[0]) {
                throw new Error(`${basename(path)} 的 @${key} 必须存在且仅有一个值。`);
            }
        }
        const field = (key) => fields.get(key)?.[0];
        if (!/^[0-9]+(?:\.[0-9]+)*$/.test(field('version'))) throw new Error(`${basename(path)} 的版本号应使用点分数字。`);
        if (!fields.has('match') && !fields.has('include')) throw new Error(`${basename(path)} 没有设置匹配页面。`);
        const identity = JSON.stringify([field('namespace'), field('name')]);
        if (identities.has(identity)) throw new Error(`${basename(path)} 的名称与命名空间和其他脚本重复。`);
        identities.add(identity);
        const scriptPath = relative(root, path).split('\\').join('/');
        const metadataPath = scriptPath.replace(/\.user\.js$/, '.meta.js');
        if (field('downloadURL') !== rawBase + scriptPath || field('updateURL') !== rawBase + metadataPath) {
            throw new Error(`${basename(path)} 的安装或更新地址与固定路径不一致。`);
        }
        const syntax = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
        if (syntax.error) throw syntax.error;
        if (syntax.status !== 0) throw new Error(`${basename(path)} 语法检查失败：\n${syntax.stderr}`);
        await saveGenerated(resolve(root, metadataPath), header[0].trimEnd() + '\n');
        rows.push(`| ${tableText(field('name'))} | ${field('version')} | ${tableText(field('description'))} | [安装 / 更新](${rawBase + scriptPath}) |`);
    }
    const readmePath = resolve(root, 'README.md');
    const readme = await readFile(readmePath, 'utf8');
    const start = readme.indexOf(catalogStart);
    const end = readme.indexOf(catalogEnd);
    if (start < 0 || end <= start) throw new Error('README.md 缺少有效的脚本目录标记。');
    const catalog = `\n\n| 脚本 | 版本 | 功能 | 入口 |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n\n`;
    await saveGenerated(readmePath, readme.slice(0, start + catalogStart.length) + catalog + readme.slice(end));
    console.log(`${checkOnly ? '检查通过' : '已生成元数据与安装目录'}：${paths.length} 个脚本。`);
} catch (error) {
    console.error(`发布检查失败：${error.message}`);
    process.exitCode = 1;
}
