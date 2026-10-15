# 浏览器用户脚本

使用 Git 管理的个人 Tampermonkey 脚本。每个脚本保留固定安装地址，后续发布通过版本号区分。

## 安装与更新

<!-- 脚本目录开始 -->

| 脚本 | 版本 | 功能 | 入口 |
| --- | --- | --- | --- |
| 知乎小助手 | 2026.10.15.1 | GitHub 风格阅读笔记，点击标题返回首页刷新，保留搜索、图片折叠和原生交互。 | [安装 / 更新](https://raw.githubusercontent.com/kaokei/userscripts/main/scripts/zhihu-helper.user.js) |

<!-- 脚本目录结束 -->

安装 Tampermonkey 后，点击表格中的“安装 / 更新”，在扩展页面确认安装。

已安装本地旧版“知乎小助手”时，也请先通过此链接更新一次，让 Tampermonkey 保存新的更新地址。脚本名称与命名空间保持原值，以识别同一个脚本。

以后 Tampermonkey 可按自身设置检查版本，也可以在扩展管理页面手动“检查更新”。发布后可能存在 GitHub 原始文件缓存延迟；是否自动安装更新由 Tampermonkey 的更新设置决定。

## 知乎小助手

提供 GitHub 风格阅读界面、独立搜索、图片折叠、首页刷新入口，以及推荐、关注、热门内容和每日热榜四个导航入口。新增的 Trending 入口指向知乎每日热榜。

## 仓库结构

```text
scripts/       正式 .user.js 脚本与自动生成的 .meta.js 更新元数据
tools/         发布前检查与安装目录生成工具
tests/         浏览器验证页和验证记录
docs/agents/   工程技能的仓库约定
```

正式脚本直接维护在 `scripts/`。`.meta.js` 仅包含元数据，由工具生成；它用于检查版本，`.user.js` 用于下载安装完整代码。

## 发布已有脚本的新版本

1. 修改 `scripts/` 中的正式 `.user.js`。
2. 提升脚本头部的 `@version`，例如从 `2026.10.15.1` 升到 `2026.10.15.2`。
3. 运行以下命令，生成更新元数据和安装目录，并检查发布内容。

```bash
npm run build
npm run check
```

这两个命令不需要安装第三方依赖，仅使用 Node.js 22 或更新版本。检查包含脚本语法、身份重复、更新地址、元数据和安装目录一致性。

4. 将脚本、对应 `.meta.js` 与更新后的目录一同提交并推送到 `main`。

```bash
git add scripts README.md
git commit -m "更新知乎小助手"
git push
```

推送后，原安装地址提供新版本。完整历史与差异保存在 Git 提交中。回滚时，恢复目标代码并发布一个更高的版本号，以便已安装的客户端识别到更新。

## 添加更多脚本

在 `scripts/` 下增加新的 `.user.js`，使用独立的名称和固定文件名。设置以下元数据，并将示例文件名替换为真实名称：

```javascript
// @updateURL    https://raw.githubusercontent.com/kaokei/userscripts/main/scripts/example.meta.js
// @downloadURL  https://raw.githubusercontent.com/kaokei/userscripts/main/scripts/example.user.js
```

运行 `npm run build` 后，新脚本的更新元数据与表格入口会自动生成，再运行检查并提交。初始版本及后续版本均使用点分数字，例如 `2026.10.15.1`。

## 浏览器验证

在仓库根目录运行本地静态服务，然后打开验证页：

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

访问 `http://127.0.0.1:8765/tests/2026-10-14-reader-github.html`，以及带 `?late=1` 的页面，分别验证脚本在页面开始时和加载完成后的行为。验证页会显示检查结果。静态发布检查不代替浏览器交互验证。

固定路径迁移的浏览器验证记录见 [2026-10-15 验证结果](tests/2026-10-15-验证结果.json)。

## 参考

更新机制参考 [Tampermonkey 官方元数据文档](https://www.tampermonkey.net/documentation.php#meta:updateURL)。
