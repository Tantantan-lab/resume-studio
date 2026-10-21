import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { defaultState } from '../src/demo/data.js';
import { runPaperDesignTests } from './paper-design.test.mjs';

const PORT = 4177;
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const executablePath = chromeCandidates.find((p) => fs.existsSync(p));

if (!executablePath) {
  console.error(
    'Chrome/Chromium not found. Set CHROME_PATH to a Chrome executable and rerun `npm test`.',
  );
  process.exit(1);
}

const server = spawn(process.execPath, ['scripts/serve.mjs', 'dist', String(PORT)], {
  stdio: 'ignore',
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let browser;
const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-export-smoke-'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await sleep(700);
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  assert(
    (await page.locator('html').getAttribute('lang')) === 'zh-CN',
    'showcase UI should default to Chinese',
  );
  assert(
    (await page.locator('#resume-preview').innerText()).includes('陈知遥'),
    'showcase resume should default to Chinese',
  );
  await page.click('#ui-language-btn');
  await page.waitForTimeout(100);
  assert(
    (await page.locator('#lang-toggle').getAttribute('data-active-lang')) === 'en',
    'switching UI to English should also switch the resume to English',
  );
  assert(
    (await page.locator('#resume-preview').innerText()).includes('Emily Carter'),
    'preview should show the English resume after the UI switch',
  );
  await page.click('#ui-language-btn');
  await page.waitForTimeout(100);
  assert(
    (await page.locator('#lang-toggle').getAttribute('data-active-lang')) === 'zh',
    'switching UI to Chinese should also switch the resume to Chinese',
  );
  assert(
    (await page.locator('#resume-preview').innerText()).includes('陈知遥'),
    'preview should show the Chinese resume after the UI switch',
  );
  const title = await page.title();
  const distHtml = fs.readFileSync('dist/index.html', 'utf8');
  const assetRefs = [...distHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((ref) => !ref.startsWith('#'));
  assert(assetRefs.length > 0, 'dist index has no asset references');
  assert(
    assetRefs.every((ref) => ref.startsWith('./')),
    `Pages subpath risk: root-absolute asset reference in dist/index.html (${assetRefs.join(', ')})`,
  );
  assert(
    assetRefs.some((ref) => ref.includes('./vendor/docx.js')),
    'dist index should load the vendor classic script',
  );
  assert(title.includes('演示') || title.includes('Marketing'), `unexpected page title: ${title}`);
  assert(
    (await page.locator('#library-count').innerText()) === '6',
    'demo library should seed 6 resumes',
  );

  await page.click('[data-section="experience"]');
  await page.waitForTimeout(200);
  assert(
    (await page.locator('#add-entry').innerText()).includes('工作经历'),
    'experience add-entry label should be 工作经历',
  );
  for (const [section, next] of [
    ['basics', 'education'],
    ['education', 'experience'],
    ['experience', 'projects'],
    ['projects', 'skills'],
    ['skills', 'style'],
  ]) {
    await page.click(`.nav-item[data-section="${section}"]`);
    await page.waitForTimeout(60);
    const nextBtn = page.locator('.editor-footer [data-next]');
    assert((await nextBtn.count()) === 1, `${section} should show one next button`);
    assert(
      (await nextBtn.getAttribute('data-next')) === next,
      `${section} next should point to ${next}`,
    );
  }
  await page.click('[data-section="library"]');
  await page.waitForTimeout(300);
  assert((await page.locator('.resume-card').count()) === 6, 'resume library cards missing');
  assert(
    await page.locator('#document-title').isDisabled(),
    'document title should be read-only while previewing',
  );
  assert(
    (await page.locator('.language-switch').evaluate((el) => getComputedStyle(el).display)) ===
      'none',
    'language switch should be hidden while previewing',
  );

  const cross = page.locator('.resume-card', {
    hasText: '跨境电商运营 · 演示',
  });
  await cross.locator('.resume-card-open').click();
  await page.waitForTimeout(300);
  assert(
    (await page.locator('#resume-preview .target').innerText()).includes('跨境电商运营'),
    'card click should update preview only',
  );
  assert(
    (await page.locator('.library-head h2').innerText()) === '我的简历',
    'card click should not enter the editor',
  );

  await cross.locator('[data-edit]').click();
  await page.waitForTimeout(300);
  if ((await page.locator('#lang-toggle').getAttribute('data-active-lang')) !== 'zh')
    await page.click('#lang-toggle');
  assert(
    (await page.locator('[data-path="basics.target"]').inputValue()) === '跨境电商运营',
    '修改 should enter the editor',
  );
  assert(
    !(await page.locator('#document-title').isDisabled()),
    'document title should be editable after entering the editor',
  );

  const preview = page.locator('#resume-preview');
  const previewText = await preview.innerText();
  for (const text of ['陈知遥', '虚构演示', '森语集数字零售', '知野内容工作室', '校园闲置交换小站'])
    assert(previewText.includes(text), `Chinese fictional demo missing ${text}`);
  for (const text of [
    '艾米莉·卡特',
    '柳叶',
    '北线',
    '布里斯托',
    'Ozon',
    'APEC',
    '农资',
    '雅思',
    '数字贸易',
  ])
    assert(!previewText.includes(text), `old content remains: ${text}`);
  assert(
    await preview.evaluate((el) => el.scrollHeight <= 1123),
    'Chinese demo should fit one A4 page',
  );
  const photo = page.locator('#resume-preview .resume-photo');
  assert((await photo.count()) === 1, 'demo photo should appear in the resume');
  assert(
    await photo.evaluate((img) => img.complete && img.naturalWidth > 0),
    'demo photo should be decoded',
  );

  await page.click('#download-btn');
  assert(
    (await page.locator('#download-options [data-export]').count()) === 6,
    'download menu should expose 6 options',
  );
  const menuText = await page.locator('#download-options').innerText();
  for (const label of [
    'Word（与预览一致）',
    'Word（可编辑）',
    'PDF（图片版）',
    'PDF（文字版）',
    '图片',
    'JSON',
  ]) {
    assert(menuText.includes(label), `download menu missing ${label}`);
  }

  await page.keyboard.press('Escape');
  const exported = {};
  for (const type of ['json', 'word', 'word-visual', 'pdf', 'png']) {
    await page.click('#download-btn');
    const pendingDownload = page.waitForEvent('download', { timeout: 20000 });
    await page.click(`[data-export="${type}"]`);
    const download = await pendingDownload;
    const filename = download.suggestedFilename();
    assert(filename.includes('跨境电商运营'), `${type} should use the selected resume title`);
    const destination = path.join(downloadDir, filename);
    await download.saveAs(destination);
    assert((await download.failure()) === null, `${type} download failed`);
    const bytes = fs.readFileSync(destination);
    assert(bytes.length > 100, `${type} export is empty`);
    exported[type] = bytes;
    await page.waitForFunction(() => !document.querySelector('#download-btn').disabled);
  }

  const json = JSON.parse(exported.json.toString('utf8'));
  assert(json.profiles.zh.basics.target === '跨境电商运营', 'JSON contains the wrong resume');
  for (const lang of ['zh', 'en']) {
    assert(
      json.profiles[lang].basics.photo.startsWith('data:image/jpeg;base64,'),
      `JSON should retain the ${lang} demo photo`,
    );
  }
  const expectedPhoto = fs.readFileSync('src/demo/demo-avatar.jpg').toString('base64');
  for (const type of ['word', 'word-visual']) {
    const media = await page.evaluate(async (base64) => {
      const zip = await window.JSZip.loadAsync(base64, { base64: true });
      const images = Object.values(zip.files).filter(
        (file) => /^word\/media\//.test(file.name) && !file.dir,
      );
      return Promise.all(
        images.map(async (file) => ({ name: file.name, bytes: await file.async('base64') })),
      );
    }, exported[type].toString('base64'));
    assert(media.length > 0, `${type} should embed images`);
    if (type === 'word') {
      assert(
        media.some((image) => image.bytes === expectedPhoto),
        'editable Word should embed the demo photo',
      );
    } else {
      assert(
        media.some((image) => image.name.endsWith('.png')),
        'visual Word should embed page PNGs',
      );
    }
  }
  const wordFontXml = await page.evaluate(async (base64) => {
    const zip = await window.JSZip.loadAsync(base64, { base64: true });
    const documentXml = await zip.file('word/document.xml').async('string');
    const stylesXml = await zip.file('word/styles.xml').async('string');
    return documentXml + stylesXml;
  }, exported.word.toString('base64'));
  assert(
    wordFontXml.includes('w:eastAsia="Arial Unicode MS"'),
    'editable Word should preserve the configured Chinese font',
  );

  assert(exported.pdf.subarray(0, 5).toString() === '%PDF-', 'invalid PDF signature');
  const pdfPages = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const pdf = await window.PDFLib.PDFDocument.load(bytes);
    return pdf.getPages().map((page) => page.getSize());
  }, exported.pdf.toString('base64'));
  assert(pdfPages.length === 1, 'demo PDF should fit one A4 page');
  assert(Math.abs(pdfPages[0].width - 595.28) < 1, 'PDF page should be A4');
  assert(
    exported.png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'invalid PNG signature',
  );
  assert(exported.png.readUInt32BE(16) === 1588, 'PNG should use the 2x A4 preview width');

  await page.evaluate(() => {
    window.__printed = false;
    window.print = () => {
      window.__printed = true;
    };
  });
  await page.click('#download-btn');
  await page.click('[data-export="pdf-text"]');
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => window.__printed === true), 'text PDF should invoke print');

  await page.click('#lang-toggle');
  const englishText = await preview.innerText();
  assert(englishText.includes('Emily Carter'), 'English demo identity missing');
  assert(englishText.includes('Fictional demo'), 'English fiction label missing');
  assert(englishText.includes('Willow Digital Retail'), 'English demo experience missing');
  assert(
    await preview.evaluate((el) => el.scrollHeight <= 1123),
    'English demo should fit one A4 page',
  );

  const roundtrip = path.join(downloadDir, 'roundtrip.docx');
  fs.writeFileSync(roundtrip, exported.word);
  await page.setInputFiles('#import-file', roundtrip);
  await page.waitForTimeout(700);
  assert(
    await page.locator('#modal').evaluate((el) => el.open),
    'DOCX import review modal missing',
  );
  await page.click('#confirm-import');
  await page.waitForTimeout(700);
  assert(
    (await page.locator('#toast').innerText()).includes('已导入'),
    'DOCX import did not finish',
  );
  assert(
    (await page.locator('.editor-heading h2').innerText()) === '项目经历',
    'DOCX import should land on the imported section',
  );
  // Multi-page visual PDF must not drop pages.
  const longState = structuredClone(defaultState);
  longState.meta.title = '长简历测试';
  const longBullets = Array.from(
    { length: 40 },
    (_, i) =>
      `第 ${i + 1} 项：围绕目标市场完成用户调研、竞品分析与内容素材整理，支持推广方案制定。`,
  );
  for (const lang of ['zh', 'en']) {
    longState.profiles[lang].experience = [
      {
        id: 'long-entry',
        company: lang === 'zh' ? '示例公司' : 'Example Co',
        role: lang === 'zh' ? '运营实习' : 'Operations Intern',
        start: '2025-01',
        end: '2025-03',
        bullets: longBullets,
      },
    ];
  }
  const longPath = path.join(downloadDir, 'long-resume.json');
  fs.writeFileSync(longPath, JSON.stringify(longState));
  await page.setInputFiles('#import-file', longPath);
  await page.waitForTimeout(700);
  const longDownload = page.waitForEvent('download', { timeout: 20000 });
  await page.click('#download-btn');
  await page.click('[data-export="pdf"]');
  const longPdf = await longDownload;
  const longPdfPath = path.join(downloadDir, 'long-resume.pdf');
  await longPdf.saveAs(longPdfPath);
  const longPageCount = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const pdf = await window.PDFLib.PDFDocument.load(bytes);
    return pdf.getPageCount();
  }, fs.readFileSync(longPdfPath).toString('base64'));
  assert(longPageCount > 1, `multi-page PDF lost pages: ${longPageCount}`);

  // Imported dates must be rendered as text, never as HTML.
  const xssState = structuredClone(defaultState);
  xssState.meta.title = 'XSS 测试';
  xssState.language = 'zh';
  xssState.profiles.zh.education[0].start =
    '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
  const xssPath = path.join(downloadDir, 'xss-resume.json');
  fs.writeFileSync(xssPath, JSON.stringify(xssState));
  await page.setInputFiles('#import-file', xssPath);
  await page.waitForTimeout(700);
  assert((await page.evaluate(() => window.__xss || 0)) === 0, 'imported date executed script');
  assert(
    (await page.locator('#resume-preview img[src="x"]').count()) === 0,
    'imported date rendered HTML',
  );
  assert(
    (await page.locator('#resume-preview').innerText()).includes('<img'),
    'imported date should be visible as escaped text',
  );

  // A cached personal resume with no library must become the active entry.
  const upgradeContext = await browser.newContext();
  const upgradePage = await upgradeContext.newPage();
  await upgradePage.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await upgradePage.waitForTimeout(500);
  const customPhoto =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ZQAAAABJRU5ErkJggg==';
  await upgradePage.evaluate((photo) => {
    const key = 'resume-studio.v1';
    const state = JSON.parse(localStorage.getItem(key));
    state.language = 'zh';
    state.profiles.zh.basics.name = '张三';
    state.profiles.en.basics.name = 'ZHANG SAN';
    state.profiles.zh.basics.photo = photo;
    state.profiles.zh.basics.photoOriginal = photo;
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.removeItem(key + '.library');
    localStorage.removeItem(key + '.active');
  }, customPhoto);
  await upgradePage.reload({ waitUntil: 'networkidle' });
  await upgradePage.waitForTimeout(700);
  assert(
    (await upgradePage.locator('[data-path="basics.name"]').inputValue()) === '张三',
    'personal resume should stay active on first library seed',
  );
  assert((await upgradePage.locator('#library-count').innerText()) === '6', 'seeded library count');
  assert(
    (await upgradePage.locator('#resume-preview img.resume-photo').getAttribute('src')) ===
      customPhoto,
    'personal photo must not be replaced by the demo avatar',
  );
  await upgradeContext.close();

  await runPaperDesignTests(browser, `http://127.0.0.1:${PORT}/`, downloadDir);

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join('; ')}`);
  console.log('PASS: library preview/edit, titles, photo, five downloads and text PDF');
} finally {
  if (browser) await browser.close();
  server.kill();
  fs.rmSync(downloadDir, { recursive: true, force: true });
}
