// 日期工具：统一本地时区日界
// 注意：toISOString() 按 UTC 切日界，东八区夜间 0-8 点会得到「昨天」的日期，
// 导致打卡/每日计划等以天为粒度的逻辑跨天错位。凡比较 YYYY-MM-DD 一律用本函数。

/** 本地时区的 YYYY-MM-DD */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
