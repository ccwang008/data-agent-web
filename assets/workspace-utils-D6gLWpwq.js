function r(e){return/正常|通过|发布|生效|已同步|已识别|成功|健康/.test(e)?"green":/中|审批|迁移|检测|识别/.test(e)?"blue":/关注|预警|整改|待|草稿/.test(e)?"amber":/异常|失败|过载|阻断/.test(e)?"red":"slate"}export{r as s};
