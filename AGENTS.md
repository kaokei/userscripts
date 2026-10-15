## 语言要求
- 所有回复和对话禁止使用日语和韩语。
- 所有回复和对话强制使用简体中文。
- 撰写的文档、代码注释和说明使用中文。
- 错误信息和日志信息的解释使用中文。
- 技术术语可以保留英文，但需要提供中文解释。

## 文档撰写规范
- 使用中文标点符号。
- 技术文档结构清晰，使用中文标题。
- 代码示例后提供中文说明。
- 保持专业但友好的语调。
- 新建文档的文件名以年月日开头，格式为 `YYYY-MM-DD`。
- 工具约定的固定入口 `README.md`、`AGENTS.md`、`CLAUDE.md`、`GLOSSARY.md`、`GLOSSARY-MAP.md` 和 `docs/agents/*.md` 保留标准文件名；其他新文档继续采用日期前缀。

## 例外情况
- 代码本身（变量名、函数名等）可以使用英文。
- 配置文件中的键值对可以使用英文。
- 第三方库和框架的名称保持原文。
- URL 和文件路径保持原文。

<!-- CODEGRAPH_START -->
## CodeGraph（代码图谱）

若仓库根目录存在 `.codegraph/`，在理解或定位代码时，先使用 CodeGraph，再进行文本搜索或读取代码文件：

- 若可用，优先调用 MCP 工具 `codegraph_explore`。问题中指定文件或符号，以读取当前带行号的源码及调用路径。
- 也可使用命令 `codegraph explore "<符号名或问题>"`。
- 若仓库根目录没有 `.codegraph/`，直接跳过 CodeGraph；是否建立索引由用户决定。
<!-- CODEGRAPH_END -->

## Agent skills（工程技能）

### 脚本维护与发布

正式脚本维护在 `scripts/*.user.js`；修改或新增脚本时，按 `README.md` 的发布约定提升版本号并运行构建与检查。`.meta.js` 与安装目录由 `npm run build` 生成。

根目录日期命名的脚本是本地兼容入口或历史备份；发布内容以 `scripts/` 为准。历史截图和本地备份由 `.gitignore` 排除。

### Issue tracker（问题追踪）

问题与需求规格使用本地 Markdown，保存在 `.scratch/<feature-slug>/`。具体约定见 `docs/agents/issue-tracker.md`。

### Domain docs（领域文档）

采用 `single-context`（单一上下文）：根目录 `GLOSSARY.md` 与 `docs/adr/`。读取规则见 `docs/agents/domain.md`。
