# 问题追踪：本地 Markdown

本仓库的需求规格与问题工单保存在 `.scratch/` 中。

## 文件约定

- 每个功能使用一个目录：`.scratch/<feature-slug>/`。
- 需求规格：`.scratch/<feature-slug>/YYYY-MM-DD-spec.md`。
- 实施工单：`.scratch/<feature-slug>/issues/YYYY-MM-DD-<NN>-<slug>.md`，从 `01` 开始编号，每个工单独立成文，不合并为单一工单文件。
- 工单顶部使用 `Status:` 字段记录状态；状态值遵循当前执行技能的约定。
- 评论和讨论按时间顺序追加在文件底部的“评论”章节，不覆盖已有记录。

## 技能操作

技能要求“发布到问题追踪系统”时，在对应的 `.scratch/<feature-slug>/` 下创建文件，缺少目录时先创建目录。

技能要求“获取相关工单”时，读取用户指定的文件路径或编号。若只提供编号且存在多个匹配文件，先确认功能目录。

## wayfinder 的探索任务

`wayfinder`（探索路线技能）使用一份任务地图和每个工单各自的文件：

- 地图：`.scratch/<effort>/YYYY-MM-DD-map.md`，记录笔记、已确认决策与未明确事项。
- 子工单：`.scratch/<effort>/issues/YYYY-MM-DD-<NN>-<slug>.md`，从 `01` 开始编号，正文写清待解决的问题。
- `Type:` 记录类型：`research`（研究）、`prototype`（原型）、`grilling`（需求质询）或 `task`（实施任务）。
- `Status:` 记录 `open`（待处理）、`claimed`（已认领）或 `resolved`（已解决）。
- `Blocked by: NN, NN` 记录阻塞依赖。列出的工单全部变为 `resolved` 后，该工单才解除阻塞。
- 从工单目录寻找状态为 `open` 且无阻塞的任务，优先选择编号最小的工单。
- 开始工作前，先保存 `Status: claimed`。
- 完成后，在“结论”章节追加答案，保存 `Status: resolved`，再将摘要和工单链接追加到地图的“已确认决策”章节。
