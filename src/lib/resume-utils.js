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

export const LEGACY_TITLES = new Set(['我的海外运营简历', '我的简历', '']);

export function exportFilename(state, extension) {
  const profile = state.profiles[state.language];
  const title = (state.meta?.title || '').trim().replace(/\s*\/\s*/g, '-');
  const base =
    title ||
    [profile.basics.name || 'Resume', state.language === 'zh' ? '中文简历' : 'English_Resume'].join(
      '_',
    );
  return (
    base
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/[\x00-\x1f]/g, '')
      .slice(0, 110) +
    '.' +
    extension
  );
}
