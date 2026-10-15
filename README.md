# 通用用户脚本仓库

按网站、脚本用途和变体维护 Tampermonkey 用户脚本。仓库中的每个 `.user.js` 都是可直接安装的完整 JavaScript 源码，通过固定 URL 安装和更新。

## 脚本目录

| 网站 | 脚本用途 | 主题变体 | 源码 | 安装与更新 |
| --- | --- | --- | --- | --- |
| 知乎 | 阅读界面 | GitHub 风格，当前主用版 | [github.user.js](zhihu/reader/github.user.js) | [安装](https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/github.user.js) |
| 知乎 | 阅读界面 | 文档阅读，暖灰背景 | [document.user.js](zhihu/reader/document.user.js) | [安装](https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/document.user.js) |
| 知乎 | 阅读界面 | 极简工作台 | [workbench.user.js](zhihu/reader/workbench.user.js) | [安装](https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/workbench.user.js) |
| 知乎 | 阅读界面 | 深色终端 | [terminal.user.js](zhihu/reader/terminal.user.js) | [安装](https://raw.githubusercontent.com/kaokei/userscripts/main/zhihu/reader/terminal.user.js) |

文档阅读、极简工作台和终端主题沿用先前各自备份的源码，后续可分别维护。GitHub 风格包含目前最新的阅读界面与导航功能。

## 安装与切换主题

安装 Tampermonkey 后，点击上表中的安装链接，在扩展页面确认。知乎的四个阅读主题作用于同一网站，每次启用其中一个主题即可。

不同主题具有独立的脚本身份和更新地址，可以保留多个主题并在 Tampermonkey 中切换启用状态。GitHub 主用版保留原来的“知乎小助手”名称和命名空间，便于旧版升级。

## 目录约定

```text
zhihu/
└── reader/
    ├── github.user.js
    ├── document.user.js
    ├── workbench.user.js
    └── terminal.user.js
scripts/                 兼容先前发布的两个旧链接
tests/                   浏览器验证页与验证记录
docs/agents/             工程技能的仓库约定
```

新脚本采用 `<站点>/<用途>/<变体>.user.js`。同一个网站可以有多个用途目录，同一个用途可以有多个变体。只有一个变体时，也可以命名为 `default.user.js`。

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

## 旧链接兼容

先前发布的 `scripts/zhihu-helper.user.js` 与 `scripts/zhihu-helper.meta.js` 保留迁移版本。原用户检查到该版本并更新后，会改为从 `zhihu/reader/github.user.js` 获取后续更新。

新安装直接使用上表入口。未来只需维护新的正式源码，旧兼容文件无需跟随每次功能变更同步。

## 版本记录与验证

Git 提交保存每次源码变更；旧主题备份和浏览截图继续留在本地。回滚已发布代码时，恢复目标内容并使用更高的 `@version` 发布，让客户端能识别更新。

需要检查语法时，可以直接运行：

```bash
node --check zhihu/reader/github.user.js
```

此命令只检查源码语法，不生成文件。浏览器验证页为 `tests/2026-10-14-reader-github.html`，可用本地静态服务分别打开普通地址和带 `?late=1` 的地址，检查两种加载时机。

本次目录调整的检查记录见 [2026-10-15 目录重组验证结果](tests/2026-10-15-目录重组验证结果.json)。

更新机制参考 [Tampermonkey 官方元数据文档](https://www.tampermonkey.net/documentation.php#meta:updateURL)。
