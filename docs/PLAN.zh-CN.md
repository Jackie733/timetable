# Timetable 开发规划（教师与学生课程表 Web 应用）

> 目标：提供在桌面端与移动端都可流畅编辑与展示的课程表，并支持优雅的 A4 打印与 PDF 导出，具备现代化、高品质的 UI/UX。

## 1. 产品目标与范围

- 面向对象：教师、学生（后续可扩展家长/教务）
- 核心能力：
  - 课程表查看（周/日视图、移动端友好、深色模式）
  - 课程表编辑（拖拽排课、冲突提示、复制/粘贴、快捷键）
  - 打印与导出（A4 纸张排版、页眉页脚、PDF 导出）
  - 分享与发布（只读分享链接、可设置时间范围/视图）
- 设计原则：
  - 现代、美观、可读性强（Inter 字体已接入）
  - 响应式与可访问性（键盘操作、ARIA、色彩对比）
  - 可靠（离线可用/PWA 选配）、可扩展（多学期、多角色、多课表）

### 商业价值与定位（补充）

- 目标人群：
  - B2C：个体老师、学生、家教、社团。
  - B2B：学校/培训机构/教研组（多人协同、排课复杂、需要批量打印与留档）。
- 核心价值：
  - 省时降错：冲突自动检测、快速导入/打印，减少人工排错与沟通成本。
  - 协作透明：跨老师/班级/家长共享，支持审批与变更记录。
  - 专业输出：高质量 PDF/多尺寸打印、校徽/抬头模板，满足校内留档与展示。
- 变现方向：
  - 订阅/团队版：协作、权限、版本管理、AI 排课/解析额度。
  - 机构版：SSO、审计日志、数据隔离、白标与 SLA。
  - 增值包：OCR 导入、ICS 双向同步、自动排课优化器。

### 典型用户痛点与功能映射（补充）

- 排课冲突频发 → 实时冲突提示 + 一键修复建议（可交换时段/教室/老师）。
- 输入成本高（Excel/图片/旧系统） → CSV/Excel 模板导入、PDF/图片 OCR 解析、.ics 日历导入。
- 多角色协作困难 → 只读/可评审/可编辑共享、评论与变更记录、版本回滚、审批流。
- 打印与展示不足 → A4/A3/横竖版模板、颜色主题/校徽抬头、批量导出、水印与页眉页脚。
- 跨平台不便 → PWA 离线、移动端优化、.ics 订阅到 Apple/Google/Outlook、钉钉/飞书内嵌页。
- 管理侧需要数据视图 → 占用率统计（教室/教师）、空闲时段雷达、调代课记录、学期模板与节假日日历。

## 2. 技术与架构

- 前端框架：React 19 + React Router v7（SSR 模式）
  - 数据路由：使用 loader/action 管理数据加载与提交流程，错误边界统一处理。
  - 参考：[React Router 文档](https://reactrouter.com/)。
- 构建工具：Vite 6
- 样式系统：Tailwind CSS v4（已接入 @tailwindcss/vite）
  - 打印样式使用 `@media print` + `@page`，A4 页面尺寸与边距自定义。
  - 参考：Tailwind v4 + 打印样式最佳实践（印刷介质样式）。
  - UI 组件：推荐引入 shadcn/ui（已对 Tailwind v4 适配）用于表单、弹窗、菜单等基础组件，保证现代化视觉与一致交互。
  - 参考：shadcn/ui Tailwind v4 指南（[链接](https://ui.shadcn.com/docs/tailwind-v4)）。
- 拖拽排课：
  - 推荐 dnd-kit（灵活、社区口碑好）或 react-beautiful-dnd 的社区分支 hello-pangea/dnd。
  - 若采用现成排课视图库，可评估 react-big-calendar/Syncfusion/Kendo 等；本项目以自研排课网格为主，保证打印/A4/移动端的深度定制能力。
- 时间与日期：date-fns（轻量、现代 API）
- 状态与校验：
  - 表单与 UI 状态：本地组件状态 + React Router action
  - 数据校验：Zod（课程时段、冲突检测的输入约束）
- 数据与持久化：
  - M1-M2 原型阶段：localStorage/IndexedDB（无后端依赖，快迭代）
  - M3+ 扩展：服务端持久化（建议 SQLite/Prisma 或 Supabase）
- PDF 导出：
  - 首选：浏览器原生打印到 PDF（高保真、零后端开销）
  - 可选：服务端 HTML→PDF（Puppeteer 或 Playwright）以满足批量/一致性需求

## 3. 信息架构与数据模型（草案）

- 实体：
  - Timetable（课表）
    - id, name, ownerId, timezone, weekStart, termRange
  - Course（课程）
    - id, title, color, teacherId, groupId, location, notes
  - Session（单次课时/实例）
    - id, timetableId, courseId, dayOfWeek, startTime, endTime, weeks[]（周次）、repeatRule（可选）
  - Teacher/Group/Room（可选实体，后续增强资源冲突检测）
  - User（角色：教师/学生）
- 关键约束：
  - 时间不重叠（同一资源：教师/教室/班级）
  - 最小时间粒度（如 5/10/15 分钟）
  - 学期/周次边界、节假日例外（后续增强）
  - 约束建模：支持硬约束（不可冲突）与软约束（偏好/权重），为自动排课与建议提供基础。

## 4. 路由与页面结构（对齐当前仓库）

- `/` 主页面（默认课表样式；支持弹窗编辑单元格）
- `/t/:id/edit-grid` 网格设置（配置显示的天数与每日节次/时间段）

说明：采用 route clientLoader/clientAction 从 IndexedDB 读写数据；错误边界兜底显示。

## 5. 关键交互与组件设计

- TimetableGrid（核心排课网格）
  - 7 列（周一~周日）/ 可配置周起始
  - 时间轴行（自定义粒度）
  - 事件卡片（课程色彩、教师/地点标识、可拖拽/缩放）
  - 移动端：纵向滚动 + 列左右切换/分段
- EditorPanel（编辑面板）
  - 新建/编辑课程、课时（Zod 校验）
  - 快捷操作：复制/粘贴、批量生成周次、模板
- ConflictBadge（冲突提示）
  - 规则：时间重叠、资源占用冲突
- WeekNavigator（周次导航）
  - 学期/周次跳转、今天回到当前周
- PrintPreview（打印预览与导出）
  - A4 尺寸、分页、页边距、页眉/页脚（学校/姓名/班级/日期）
- 导航与菜单
  - 顶部栏：返回、视图切换、打印、分享
  - 右侧操作：导入/导出（JSON/CSV/ICS）、主题切换、共享权限与审批
- ImportExportPanel（导入导出面板）
  - CSV/Excel 模板下载与导入、.ics 导出/订阅、JSON 备份/恢复
- VersionHistory & Comments（版本历史与评论）
  - 可回滚、差异对比、逐项批注；用于评审/审批
- ConflictAssistant（冲突助手）
  - 实时冲突识别，提供可替代时段/教室/老师的修复建议
- StatsDashboard（统计面板）
  - 教师/教室占用率、空闲时段、调代课记录

## 6. 视觉与体验规范

- 颜色与排版：
  - 字体：Inter（已接入）
  - 课程色彩：可选主题色板，保证打印与深色模式下对比度
- 深色模式：系统跟随 + 手动切换
- 动效：拖拽/放置/冲突抖动提示（轻量，不干扰可读性）
- 可访问性：
  - 键盘导航（Tab、方向键移动、Enter 编辑）
  - ARIA 标签（网格、事件、操作）
  - 色彩对比符合 WCAG AA

## 7. 打印与 PDF 方案

- 打印（首选）
  - 使用 `@media print` 与 `@page` 控制 A4 规格与边距：
    - A4 尺寸：`@page { size: A4 portrait; margin: 12mm; }`
    - 打印专用样式（隐藏交互控件、优化线条/颜色/分隔）
    - Tailwind 辅助：`print:*` 原子类（如 `print:hidden`/`print:block`）
- PDF 导出（两种）
  - 前端：用户使用系统“打印为 PDF”（零后端、实现快）
  - 服务端：HTML→PDF（Puppeteer/Playwright）保证一致性与批量导出（需 SSR 路由与队列/并发控制）

补充：

- 模板：支持 A4/A3、横/竖版、颜色主题、校徽/抬头、水印与页眉页脚可配置。
- 批量导出：按班级/教师/教室维度批量生成 PDF。

## 8. 测试与质量

- 单元测试：Vitest + React Testing Library（组件、时间计算、冲突检测）
- 端到端：Playwright（关键路径：创建课表、拖拽、打印预览）
- Lint/格式化：ESLint + Prettier（已配置）
- 性能：
  - 大课表虚拟化（仅渲染视窗内格子/事件）
  - 复杂布局的 memo 与事件碰撞检测优化（空间索引/线段树可选）

## 9. DevOps 与发布

- 包管理：pnpm（建议统一，锁定版本）
- CI：GitHub Actions
  - 安装 → typecheck → lint → test → 构建
- 部署：
  - Node SSR：Fly.io/Railway/Cloud Run（容器）
  - 纯静态只读分享页可托管至静态平台（如 Cloudflare Pages），但编辑页需 SSR/服务端 API
  - 集成：支持在钉钉/飞书/企业微信内嵌，及与 Google Workspace/Microsoft 365 同步（.ics/单点登录 机构版）。

## 10. 里程碑与时间线（示例 6–8 周）

- M0 启动（0.5 周）
  - 明确需求、信息架构、视觉基调（本计划）
- M1 课表查看（1.5 周）
  - TimetableGrid 只读版（周视图/日视图、移动端适配）
  - 示例数据（localStorage/JSON）
- M2 课表编辑（2 周）
  - dnd 拖拽/缩放、表单编辑、Zod 校验
  - 冲突检测（同一教师/教室）
- M3 打印与导出（1 周）
  - A4 打印样式与预览页
  - PDF（前端打印到 PDF）与导出 JSON/.ics
  - 导入：CSV/Excel 模板导入（基础字段：课程/教师/教室/时间/周次）
- M4 分享与只读（0.5–1 周）
  - 分享链接（token）、权限限制
- M5 打磨与可访问性（1 周）
  - 深色模式、键盘导航、动画与性能优化
  - 测试覆盖、文档与示例
- M6（可选）服务端持久化与批量 PDF（1–2 周）
  - Prisma/SQLite 或 Supabase；Puppeteer/Playwright 服务端导出

并行轨道：AI Lab（贯穿 M2–M6，按可用性渐进发布）

- OCR/结构化解析：解析教务处 PDF/图片/Excel → 结构化课表
- 自动排课（小规模先行）：基于约束（硬/软）与求解器（如 OR-Tools），输出方案与解释
- 自然语言改表：支持“把高一1班数学固定到周二上午，避免和化学冲突”等指令，生成差异预览
- 智能冲突诊断与修复建议：给出替代时段/资源与影响范围说明

## 11. 风险与应对

- 排课网格复杂度高：先实现 80% 场景，再优化边缘（跨天、跨周、压缩周末列）
- 打印差异（浏览器/设备）：提供打印预览、可调缩放与边距、推荐浏览器方案
- PDF 服务端资源消耗：限制并发、排队、缓存、限制页面大小
- 移动端拖拽手势：提供替代交互（长按+表单、点击调起编辑）

## 12. 参考资料（精选）

- React Router v7（数据路由/SSR）: <https://reactrouter.com/>
- Tailwind 打印与 `@page`（A4 尺寸与样式）：
  - CSS Print Styles & `@media print`（通用实践）
- shadcn/ui Tailwind v4 适配：
  - <https://ui.shadcn.com/docs/tailwind-v4>
- 排课/日历选型与拖拽：
  - React Big Calendar/Syncfusion Scheduler（能力参考）
  - dnd-kit 与 hello-pangea/dnd（拖拽库对比）
- PDF 生成：
  - 前端“打印为 PDF”
  - 服务端 Puppeteer/Playwright HTML→PDF（批量/一致性）

---

## 13. AI 能力与方向（并行实验）

- AI 排课助手：输入老师/教室/课程与约束，调用求解器生成方案；LLM 负责解释与交互。
- 自然语言建表/改表：文本/语音指令转结构化操作，提供变更方案与差异预览。
- OCR/结构化解析：解析图片/PDF/Excel 的课表为结构化数据，对齐节次/周次/单双周。
- 智能冲突诊断与修复：生成可执行的替代方案并标注影响范围。
- 个人助理与问答：如“我下周三第3节空不空？”“找所有老师都空的一小时”。
- 智能打印与布局：根据内容密度与色彩对比自动调优布局与配色。
- 预测与推荐：基于历史偏好与满意度，推荐更优时段与教室。

## 14. 增长与商业化建议

- Freemium：基础编辑/打印免费；协作、版本、OCR、AI 排课、统计为 Pro。
- 团队/机构版：按教师席位/校区计费；支持 SSO、审计、数据导出、私有化部署选项。
- 集成生态：对接钉钉/飞书/企业微信、Google Workspace、Microsoft 365、家校平台。
- 定价与额度：按月/年订阅 + AI 使用额度（OCR/排课计算）。

## 附：近期落地清单（面向当前仓库）

- 对齐 README（从模板过渡为 Timetable 描述）
- 路由接入：`/`、`/t/:id/edit-grid`
- 引入基础 UI（shadcn/ui）与日期库（date-fns）
- 搭建 TimetableGrid 雏形与示例数据
- 冲突检测基础版（同教师/教室资源冲突）+ ConflictAssistant 提示位
- 导入导出：CSV/Excel 模板 + JSON/ICS 导出，ImportExportPanel 雏形
- 打印样式骨架：`@media print` 与 `@page { size: A4; }`，A4 模板（页眉/页脚/校徽占位）
- 只读分享链接（最小权限）

## 运行（现状）

```bash
pnpm install
pnpm dev
```

如需生产构建：

```bash
pnpm build
pnpm start
```
