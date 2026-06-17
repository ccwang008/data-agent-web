# 文档自定义解析设置

## Summary
将文档列表现有解析器下拉框替换为居中“解析设置”弹窗，支持自动解析和自定义解析，并保持纯前端 mock 数据流。

## Implementation Changes
- 扩展 `KnowledgeDocument`：
  - `parseMode: "auto" | "custom"`
  - `customParseConfig`: 分片大小、分片重叠、预处理开关、敏感内容策略。
- 新上传文档默认自动解析；每篇文档保留上次自定义配置。
- 新增解析设置弹窗：
  - 使用单选框选择自动解析或自定义解析。
  - 自动解析隐藏自定义字段。
  - 自定义解析提供 Token 分片大小与重叠设置。
  - 分片大小默认 `512`，范围 `1–8192`。
  - 分片重叠默认 `50`，范围 `0–分片大小-1`。
  - 文档预处理使用统一开关，默认关闭。
  - 开启后处理特殊字符、敏感内容和重复内容。
  - 敏感内容策略提供“脱敏后入库”和“阻止入库”，默认脱敏。
- 弹窗使用草稿状态；取消、遮罩关闭或 `Esc` 不保存，校验通过后才回写文档列表。
- 列表解析器列显示“自动解析”或“自定义解析”；自定义模式同步显示实际切片大小。
- 更新知识中心的 `requirements.md`、`design.md`、`tasks.md`，并将完整计划归档至 `specs/features/knowledge-center/plans/`。

## Interfaces
```ts
type ParseMode = "auto" | "custom";
type SensitiveContentAction = "mask" | "block";

interface CustomParseConfig {
  chunkSize: number;
  chunkOverlap: number;
  preprocessingEnabled: boolean;
  sensitiveContentAction: SensitiveContentAction;
}
```

不新增路由、依赖或 mock API。

## Test Plan
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- 手动验证模式切换、配置保留、输入边界、取消不保存及保存回显。
- 验证预处理默认关闭；开启后可选择脱敏或阻止入库。
- 验证新上传文档默认采用自动解析。

## Assumptions
- 首版只实现配置交互，不执行真实解析、敏感检测或持久化。
- 特殊字符包含连续空格、控制字符、乱码字符和 HTML 标签。
- 重复内容涵盖页眉页脚、目录、段落及 OCR 重复识别内容。
- 当前基线 `typecheck` 与 `lint` 均通过。
