# 通用用户脚本仓库

按网站、脚本用途和变体维护 Tampermonkey 用户脚本。仓库中的每个 `.user.js` 都是可直接安装的完整 JavaScript 源码，通过固定 URL 安装和更新。

## 脚本目录

| 网站 | 脚本用途 | 变体 | 源码 | 安装与更新 |
| --- | --- | --- | --- | --- |
| 知乎 | 阅读界面 | GitHub 风格，当前主用版 | [github.user.js](zhihu/reader/github.user.js) | [安装](https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/github.user.js) |
| 知乎 | 阅读界面 | 文档阅读，暖灰背景 | [document.user.js](zhihu/reader/document.user.js) | [安装](https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/document.user.js) |
| 知乎 | 阅读界面 | 极简工作台 | [workbench.user.js](zhihu/reader/workbench.user.js) | [安装](https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/workbench.user.js) |
| 知乎 | 阅读界面 | 深色终端 | [terminal.user.js](zhihu/reader/terminal.user.js) | [安装](https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/terminal.user.js) |
| 通用 | 解除复制限制 | 强力复制 | [default.user.js](common/copy/default.user.js) | [安装](https://raw.githubusercontent.com/kaokei/userscripts/main/common/copy/default.user.js) |

文档阅读、极简工作台和终端主题沿用先前各自备份的源码，后续可分别维护。GitHub 风格包含目前最新的阅读界面与导航功能。

## 安装与切换主题

安装 Tampermonkey 后，点击上表中的安装链接，在扩展页面确认。知乎的四个阅读主题作用于同一网站，每次启用其中一个主题即可。

不同主题具有独立的脚本身份和更新地址，可以保留多个主题并在 Tampermonkey 中切换启用状态。GitHub 主用版保留原来的“知乎小助手”名称和命名空间，便于旧版升级。

## 网页强力复制

“Copying Lifted 网页强力复制”适用于所有网站，沿用原 `copy-test.js` 的处理逻辑，临时解除复制、选取和右键等限制。它会拦截键盘、鼠标等事件，可能影响网页交互，适合在需要复制时启用并刷新页面，完成后禁用并再次刷新。

迁移版保留原名称和命名空间，版本为 `1.0.5`。原安装若仍使用 Greasy Fork 更新地址，请通过上表入口安装迁移版，后续通过本仓库更新。

## 目录约定

```text
common/
└── copy/
    └── default.user.js
zhihu/
└── reader/
    ├── github.user.js
    ├── document.user.js
    ├── workbench.user.js
    └── terminal.user.js
docs/agents/             工程技能的仓库约定
```

新脚本采用 `<站点>/<用途>/<变体>.user.js`。同一个网站可以有多个用途目录，同一个用途可以有多个变体。只有一个变体时，也可以命名为 `default.user.js`。

跨网站通用脚本放在 `common/<用途>/` 下。

`scripts/` 中的旧版辅助文件、`tests/` 中的浏览器验证页和验证记录仅保留在维护者本地，已通过 `.gitignore` 忽略。

## 更新已有脚本

1. 直接编辑对应 `.user.js` 源文件。
2. 提升头部的 `@version`，例如从 `2026.10.15.2` 改为 `2026.10.15.3`。
3. 提交并推送修改。

```bash
git add zhihu/reader/github.user.js
git commit -m "更新知乎 GitHub 阅读主题"
git push
```

推送后，固定 URL 即提供新源码，无需构建、打包或生成元数据文件。Tampermonkey 会按自身更新设置检查版本，也可以在扩展管理页手动检查更新；GitHub 原始文件缓存可能造成短暂延迟。

每个源文件中的 `@updateURL` 与 `@downloadURL` 指向同一个 `.user.js`。前者用于读取版本元数据，后者用于下载完整更新代码。

## 新增脚本或变体

复制一个适合的 `.user.js` 到新的目录或文件名，调整功能与以下元数据，再把安装链接加到上表：

```javascript
// @name         独立的脚本或主题名称
// @version      2026.10.15.1
// @updateURL    https://raw.githubusercontent.com/kaokei/userscripts/main/站点/用途/变体.user.js
// @downloadURL  https://raw.githubusercontent.com/kaokei/userscripts/main/站点/用途/变体.user.js
```

将示例路径替换为真实目录和文件名，设置正确的 `@match` 页面范围。不同变体使用不同的脚本名称或命名空间；同一变体后续更新时保持身份和 URL 稳定。

## 旧安装迁移

先前发布的 `scripts/zhihu-helper.user.js` 与 `scripts/zhihu-helper.meta.js` 已停止提供在线更新。仍使用旧地址的安装，请从上表的 GitHub 风格入口重新安装，后续更新将使用正式源码地址。

## 版本记录与验证

Git 提交保存每次源码变更；旧主题备份和浏览截图继续留在本地。回滚已发布代码时，恢复目标内容并使用更高的 `@version` 发布，让客户端能识别更新。

需要检查语法时，可以直接运行：

```bash
node --check zhihu/reader/github.user.js
```

此命令只检查源码语法，不生成文件。若本地保留了 `tests/2026-10-14-reader-github.html`，可用本地静态服务分别打开普通地址和带 `?late=1` 的地址，检查两种加载时机。

更新机制参考 [Tampermonkey 官方元数据文档](https://www.tampermonkey.net/documentation.php#meta:updateURL)。
