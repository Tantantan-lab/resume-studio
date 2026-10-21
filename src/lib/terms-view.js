import { store } from './store.js';
import { esc } from './util.js';
import { notify } from './ui.js';
import { terminology } from '../terms.js';

export function renderTerms(q) {
  const rows = terminology.filter((t) =>
    [t.cn, t.en, t.category].join(' ').toLowerCase().includes(q.toLowerCase()),
  );
  $('#term-list').innerHTML =
    rows
      .map(
        (t) =>
          `<div class="term"><div class="term-head"><strong>${esc(t.cn)}</strong><span class="badge ${t.evidence === 'supported' ? '' : 'pending'}">${t.evidence === 'supported' ? '有经历依据' : '待补充依据'}</span></div><div class="term-en">${esc(t.en)}</div><p>${esc(t.definition)}</p><p>${esc(t.resumeEvidence)}</p><div class="term-actions"><a href="${esc(t.sourceUrl)}" target="_blank" rel="noopener noreferrer">BOSS 公开摘录 ↗</a><button data-copy="${esc(store.state.language === 'en' ? t.en : t.cn)}">复制词汇</button></div></div>`,
      )
      .join('') || '<p>没有匹配的词汇。</p>';
  $('#term-list')
    .querySelectorAll('[data-copy]')
    .forEach(
      (e) =>
        (e.onclick = async () => {
          try {
            await navigator.clipboard.writeText(e.dataset.copy);
            notify('已复制，请结合真实经历使用。');
          } catch {
            notify('当前浏览器不允许复制，请手动选取词汇。');
          }
        }),
    );
}
