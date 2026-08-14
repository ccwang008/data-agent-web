# Data Security · 数据安全任务

## 已完成 · Baseline Done

- [x] T-data-security-01 建立基础分级分类和脱敏/加密页面
- [x] T-data-security-02 接入 `data-agent.data-security.classification`、`data-agent.data-security.masking` SQLite scope 与 mock 策略执行
- [x] T-data-security-03 接入 `/classification`、`/masking` 路由和两项菜单
- [x] T-data-security-04 完成 DCMM 第4级合规增强需求访谈、领域词汇、ADR、三级菜单、requirements/design 和实施计划
- [x] T-data-security-04a 将基础分类页重构为等级矩阵与审批证据工作台，将基础脱敏页重构为策略与效果预览工作台
- [x] T-data-security-04b 移除业务页统一“指标 + 列表”模板，按控制矩阵、审批看板、流程向导、报告编制、执行底稿和事件时间线重构页面结构
- [x] T-data-security-04c 消除固定左中右三栏滥用，仅分类识别、访问控制和事件台账保留有业务必要性的三栏；其余页面改为全宽、双栏或上下分区结构

## P0 · 合规与证据主闭环

- [x] T-data-security-05 建立目标数据模型、六个分域 SQLite scope、`schemaVersion` 和旧分类/脱敏记录非破坏迁移
- [ ] T-data-security-06 建立共享 `SecurityEvidenceRef` 契约和脱敏证据注册表，禁止 feature 直接 import
- [x] T-data-security-07 安全驾驶舱：DCMM 三域就绪度、可追溯量化指标、证据缺口、组织证据和统一待办
- [x] T-data-security-08 合规清单与合规审查：规则包版本、适用性、个人信息、重要数据、外部评估证据和整改
- [x] T-data-security-09 重构分类识别页：数据项粒度、多选分类、一般/重要/核心单选等级、元数据/脱敏样例和确定性 mock 扫描
- [x] T-data-security-10 分类复核与规则页：置信度、冲突、抽样复核、重要/核心双人批准、组合升级、禁止自动降级
- [x] T-data-security-11 分类分级报告：范围/依据/结果/影响快照、草稿/复核/批准/失效状态、差异和版本冻结
- [x] T-data-security-12 数据出境评估：场景、年度累计数量、材料证据、路径建议、双重审批、规则影响和重新评估
- [x] T-data-security-13 安全审计计划与执行：过程/规范/合规/供应商四类审计、内外部审计关联和审计发现
- [x] T-data-security-14 审计证据与报告：来源事件引用、完整性校验、证据缺口、一键草稿、独立复核、版本冻结和整改闭环
- [x] T-data-security-15 完成 P0 页面路由后建立一级/二级/三级稳定菜单 key；未实现页面不得提前加入当前菜单

## P1 · 安全防护与事件响应

- [x] T-data-security-16 防护策略与访问控制：分类等级基线、主体/对象/用途/期限/配额、例外和模拟校验
- [x] T-data-security-17 脱敏管理：静态/动态规则、掩码/泛化/替换/哈希/令牌化、脱敏样例、审批、执行和例外
- [x] T-data-security-18 加密管理：传输/存储/字段策略、算法、密钥引用、轮换状态、执行证据和敏感输入防护
- [x] T-data-security-19 数据水印：显式/隐式追踪策略、模板、模拟嵌入、追踪标识、验证和来源追踪记录
- [x] T-data-security-20 安全监控与风险：异常规则、安全信号、风险清单、评估报告、整改和知识库
- [x] T-data-security-21 安全事件台账：信号/疑似/事件、S1–S4、五阶段状态、时间线、证据和独立关闭复核
- [x] T-data-security-22 轻量事件 SOP、版本化通知义务、法务判断、模拟通知记录、演练和复盘

## P2 · 报告、体验与联动

- [ ] T-data-security-23 统一分类、出境、审计和事件报告组件，提供指标口径、规则版本、证据清单、限制和审批的模拟导出
- [ ] T-data-security-24 联动数据资产：分类版本、等级变化影响、产品/授权安全待复核和保护策略引用
- [ ] T-data-security-25 联动数据集成、开发、调度、运维和设置的脱敏访问/流转/交换/操作/执行证据引用
- [ ] T-data-security-26 补齐 `data-security` i18n namespace、Classic Light SaaS 视觉、桌面端表格分页和可访问性
- [ ] T-data-security-27 覆盖正常、空、加载、失败、运行中、成功、部分成功和已停止 mock 状态
- [x] T-data-security-28 全部目标页面完成后将 `/data-security` 默认入口切换为 `/overview`，并同步当前路由、菜单、README、AGENTS 和平台规格

## 验证 · Verification

- [ ] T-data-security-29 为分类自动生效、重要/核心审批、资产聚合、指标未知值、出境路径、证据完整性和事件关闭规则补纯函数测试
- [ ] T-data-security-30 验证菜单与路由一致性、SQLite 刷新恢复、旧 scope 迁移幂等、敏感字段拒绝和报告不可覆盖
- [x] T-data-security-31 运行 `npm run typecheck`、`npm run lint`、`npm test`、`npm run build` 和 `npm run db:inspect`

## 历史 · Changelog

- 2026-08-13：完成基础两页 SQLite mock。
- 2026-08-13：确认 DCMM 第4级合规增强、三级菜单、脱敏、加密、水印、出境、审计和事件响应设计。
- 2026-08-13：完成 25 个功能页、六分域状态、三级菜单、确定性规则、旧 scope 迁移与首批纯函数测试。
- 2026-08-13：按业务任务完成页面结构差异化，顶部指标仅保留在安全总览及确有量化决策需求的局部区域。
- 2026-08-13：完成第二轮信息架构校正，移除流程、报告、矩阵、规则和执行页面的固定三栏壳。
