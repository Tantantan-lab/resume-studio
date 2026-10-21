export function autoResumeName(profile, region) {
  const b = profile?.basics || {};
  return `${b.target || '未命名岗位'} ${b.salary || '面议'} ${region || '深圳'}`;
}

export function resumeName(entry) {
  const s = entry.state;
  const base =
    (s.meta?.title || '').trim() ||
    autoResumeName(s.profiles?.[s.language] || s.profiles?.zh, entry.region);
  return base + (entry.note ? ` · ${entry.note}` : '');
}

export function fileBase(vs) {
  return ((vs.meta?.title || '').trim() || vs.profiles[vs.language]?.basics?.name || 'Resume')
    .replace(/\s*\/\s*/g, '-')
    .replace(/[<>:"/\\|?*]/g, '_')
    .slice(0, 80);
}
