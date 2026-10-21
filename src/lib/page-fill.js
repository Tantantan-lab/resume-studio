// Expand vertical rhythm within one A4 page without changing text or font sizes.
const PAGE_HEIGHT = (297 * 96) / 25.4;
const MAX_GAP = 64;
export function applyPageFill(paper, enabled) {
  paper.dataset.fillPage = 'false';
  paper.dataset.fillState = 'disabled';
  paper.style.setProperty('--resume-fill-gap', '0px');
  const content = paper.querySelector('.resume-body, .resume-columns');
  if (!enabled || !content || !content.querySelector('section')) return 'disabled';
  const bottom = () => {
    const css = getComputedStyle(paper);
    const paperRect = paper.getBoundingClientRect();
    const scale = paperRect.width / parseFloat(css.width) || 1;
    const rect = content.getBoundingClientRect();
    return (rect.bottom - paperRect.top) / scale + parseFloat(css.paddingBottom);
  };
  const target = PAGE_HEIGHT - 2;
  if (bottom() > PAGE_HEIGHT + 1) {
    paper.dataset.fillState = 'overflow';
    return 'overflow';
  }
  paper.dataset.fillPage = 'true';
  let low = 0;
  let high = MAX_GAP;
  paper.style.setProperty('--resume-fill-gap', `${high}px`);
  if (bottom() <= target) {
    paper.dataset.fillState = 'limited';
    return 'limited';
  }
  for (let iteration = 0; iteration < 14; iteration++) {
    const gap = (low + high) / 2;
    paper.style.setProperty('--resume-fill-gap', `${gap}px`);
    if (bottom() <= target) low = gap;
    else high = gap;
  }
  paper.style.setProperty('--resume-fill-gap', `${low.toFixed(3)}px`);
  paper.dataset.fillState = 'filled';
  return 'filled';
}
export const FILL_LABELS = {
  disabled: '保持原有间距',
  filled: '已铺满一页',
  limited: '已使用最大舒适间距',
  overflow: '内容超过一页，保持原间距',
};
