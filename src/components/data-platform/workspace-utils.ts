export type WorkspaceTone = "green" | "blue" | "amber" | "red" | "slate" | "violet";

export function statusTone(status: string): WorkspaceTone {
  if (/正常|通过|发布|生效|已同步|已识别|成功|健康/.test(status)) return "green";
  if (/中|审批|迁移|检测|识别/.test(status)) return "blue";
  if (/关注|预警|整改|待|草稿/.test(status)) return "amber";
  if (/异常|失败|过载|阻断/.test(status)) return "red";
  return "slate";
}
