# Timetable MVP 规格与实施计划（教师/学生课表 + A4 打印/PDF + IndexedDB）

> 目标：在不依赖服务端的前提下，交付可在桌面与移动端流畅使用的教师/学生课表应用，支持编辑与查看，并提供高质量的 A4 打印与 PDF 导出；本地数据持久化基于 IndexedDB。

## 1. MVP 范围与成功标准

- 模式与对象
  - 教师课表：建立课程与课时（可包含地点/备注），快速编排每周固定节次
  - 学生课表：建立个人课表（可选引用课程模板），快速录入或调整个人节次
- 必备功能（Must-Have）
  - 查看：周视图（主）、日视图（次），支持深色模式与移动端
  - 编辑：新增/编辑/删除课时；拖拽移动、边缘缩放（时长）；基础冲突提示
  - 打印与 PDF：打印预览页，A4 纸张样式；浏览器“打印为 PDF”导出
  - 数据持久化：IndexedDB 本地存储，页面刷新/离线保留
- 成功标准（验收）
  - 可在 Chrome/Edge/Safari、Android/iOS 浏览器使用；移动端无水平滚动条（正常交互）
  - 周视图打印为 A4 portrait 至少可读；超长内容分页良好、页眉信息完整
  - IndexedDB 中新增/编辑/删除后刷新仍正确；版本升级不丢数据（简单迁移）

## 2. 非功能需求（MVP 必要）

- 可用性：核心流程 3 步内可完成（新增一节课）
- 响应式：≥ 320px 宽设备可用；≥ 768px 有两栏编辑体验
- 可访问性：键盘可操作（方向键移动聚焦、Enter 编辑）；颜色对比满足基础可读性
- 性能：周视图渲染 150–200 节/周 仍流畅（滚动不卡顿）

## 3. 技术栈与关键库

- React 19 + React Router v7（SSR 已启用，前端数据加载使用 clientLoader）
  - 参考：[React Router 数据加载](https://reactrouter.com/start/framework/data-loading)、[Client Data](https://reactrouter.com/how-to/client-data)
- 样式：Tailwind CSS v4（已接入 `@tailwindcss/vite`）
- 拖拽：dnd-kit（`@dnd-kit/core` + `@dnd-kit/sortable`）
- 日期处理：date-fns
- 数据校验：Zod
- IndexedDB 封装：Dexie v4（简化事务与索引查询；类型友好）
  - 参考：[Dexie + TypeScript 指南](https://dexie.org/docs/Typescript)、[React 教程](https://dexie.org/docs/Tutorial/React)
- UI 基础组件（可选）：shadcn/ui（已兼容 Tailwind v4，用于对话框、下拉、表单控件）
  - 参考：[shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)

建议安装（Zsh）：

```sh
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers date-fns zod dexie
# 可选 UI：后续按需接入
```

## 4. 路由与页面（MVP）

- `/` 主页面（显示当前课表的表格视图，仿截图；支持弹窗编辑单元格）
- `/t/:id/edit-grid` 网格设置（配置显示的天数与每日节次/时间段）

说明：

- 数据加载：使用 `clientLoader` 从 IndexedDB 读取（客户端水合后读取）
- 数据提交：使用 `clientAction` 写入 IndexedDB，并触发重新加载

## 5. 数据模型与 IndexedDB 设计（Dexie v4）

- 数据库：`timetable-db`，版本号从 1 起（保留升级钩子）
- 表与索引（建议）
  - `timetables`: `{ id (uuid), name, type: 'teacher'|'student', timezone, weekStart, termRange }`
    - 索引：`id`
  - `courses`: `{ id, timetableId, title, color, teacherName?, location?, notes? }`
    - 索引：`[timetableId+title], timetableId, id`
  - `sessions`: `{ id, timetableId, courseId, dayOfWeek (0-6), startMinutes, endMinutes, weeks: number[], location? }`
    - 索引：`[timetableId+dayOfWeek], timetableId, courseId, id`

说明：

- `startMinutes/endMinutes` 以当天 00:00 起的分钟数存储，便于比较与渲染
- 冲突检测：同一 `timetableId`、同一 `dayOfWeek` 且时间区间重叠视为冲突（课程或资源维度可后续增强）
- 迁移：Dexie `db.version(x).stores({...}).upgrade(tx => ...)` 维护字段演进

## 6. 关键交互与组件（MVP）

- TimetableGrid（核心网格）
  - 7 列（可配置周起始）、时间轴行（15 分钟粒度，配置项）
  - 事件卡片：显示课程名、地点；支持拖拽移动与垂直缩放时长
  - 移动端：纵向滚动，顶部日/周切换；卡片点击进入编辑
- EditorPanel（编辑面板）
  - 表单字段：课程、星期、开始/结束时间、地点、颜色、适用周次
  - Zod 校验（时间顺序、非空、周次范围）
- ConflictBadge（冲突提示）
  - 同日同时间段重叠高亮提示（保存/拖拽时检测）
- WeekNavigator（周次导航）
  - 切换周次、返回本周
- PrintPreview（打印预览）
  - A4 `@page { size: A4 portrait; margin: 12mm; }`
  - 打印专用：隐藏按钮/阴影、颜色优化、分页控制（避免行间断裂）

## 7. 打印与 PDF 实现要点

- 样式：
  - `@media print` 中使用 `@page` 设置 A4 及页边距
  - 使用 `break-inside: avoid;`、`page-break-inside: avoid;` 避免卡片跨页断裂
  - 提供 `print:` 前缀工具类（如 `print:hidden`、`print:block`）控制显示
- 交互：
  - `/t/:id/print` 页面提供“打印”按钮（调用 `window.print()`）与使用说明
- 导出 PDF：
  - 指引用户使用系统“打印为 PDF”（跨平台一致性较好、零后端）

## 8. 实施计划（2–3 周）

- 第 1 周
  - 搭建 IndexedDB（Dexie）与类型定义；示例数据种子
  - TimetableGrid 只读版（周视图）+ 日/周切换
  - 教师/学生模式：差异仅在默认字段与配色（同一数据结构，`type` 区分）
- 第 2 周
  - EditorPanel 表单 + Zod 校验；创建/编辑/删除课时
  - dnd-kit 拖拽/缩放；保存前冲突检测
  - 打印预览页 + A4 样式初版；基础分页与页眉
- 第 3 周（缓冲/打磨）
  - 性能与可访问性（键盘导航）
  - IndexedDB 升级与回归测试；移动端交互细节
  - 文档与引导（首次使用指引、打印指引）

## 9. 交付清单（Done 的标准）

- 教师/学生两种模式均可：创建课表 → 添加课程与课时 → 查看/编辑/删除
- 周视图可打印为 A4 PDF，信息完整、排版不溢出
- IndexedDB 持久化生效；刷新/离线可用
- 覆盖以下浏览器：Chrome（含 Android）、Edge、Safari（含 iOS）

## 10. 风险与对策（MVP）

- 打印差异（不同浏览器/缩放）：提供打印预览页与提示推荐浏览器；留有边距冗余
- 拖拽在移动端手势冲突：支持长按进入编辑作为替代；可关闭拖拽仅表单编辑
- 数据迁移与丢失：版本升级前备份导出 JSON（可选）；编写简单导入/导出功能

## 11. 后续可选（非 MVP）

- 只读分享链接、批量 PDF 导出（服务端）
- 多资源冲突（教师/教室/班级）与多课表聚合
- 模板库、学期批量生成、节假日例外

## 12. 开发提示与参考

- React Router v7 数据与客户端加载：
  - 文档：<https://reactrouter.com/start/framework/data-loading>、<https://reactrouter.com/how-to/client-data>
- Dexie（IndexedDB）：
  - 文档：<https://dexie.org/docs/Typescript>、<https://dexie.org/docs/Tutorial/React>
- shadcn/ui（Tailwind v4）：
  - 文档：<https://ui.shadcn.com/docs/tailwind-v4>

---

## 附：近期开发任务（面向当前仓库）

1. 依赖安装与基础设施

```sh
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers date-fns zod dexie
```

1. 路由接入：`/`、`/t/:id/edit-grid`（使用 clientLoader/clientAction）

1. IndexedDB：`db.ts`（Dexie 实例）、表结构与类型、示例数据

1. 组件：TimetableGrid（只读→可编辑）、EditorPanel、PrintPreview

1. 打印样式：`@media print` 与 `@page { size: A4; }`、分页与页眉

1. 基础测试：时间换算、冲突检测、IndexedDB 读写
