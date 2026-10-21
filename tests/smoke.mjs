import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

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
  assert(
    title.includes('市场营销') || title.includes('简历工坊'),
    `unexpected page title: ${title}`,
  );
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

  const cross = page.locator('.resume-card', { hasText: '跨境电商运营 8–10K 杭州' });
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
  for (const text of ['陈知遥', '虚构演示', '森语集', '知野', '校园闲置交换小站'])
    assert(previewText.includes(text), `new fictional demo missing ${text}`);
  for (const text of ['Ozon', 'APEC', '农资', '雅思', '数字贸易'])
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
  assert(englishText.includes('ZHIYAO CHEN'), 'English demo identity missing');
  assert(englishText.includes('Fictional demo'), 'English fiction label missing');
  assert(englishText.includes('Senyu Digital Retail'), 'English demo experience missing');
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
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join('; ')}`);
  console.log('PASS: library preview/edit, titles, photo, five downloads and text PDF');
} finally {
  if (browser) await browser.close();
  server.kill();
  fs.rmSync(downloadDir, { recursive: true, force: true });
}
