import fs from 'node:fs';
import path from 'node:path';

function assert(condition, message) {
  if (!condition) throw new Error(`Paper design: ${message}`);
}

// Runs in a clean browser context so the original smoke test's imported data stays isolated.
export async function runPaperDesignTests(browser, baseUrl, downloadDir) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  let serial = 0;
  const pause = () => page.waitForTimeout(450);
  const preview = page.locator('#resume-preview');
  async function download(type) {
    await page.click('#download-btn');
    const pending = page.waitForEvent('download', { timeout: 25000 });
    await page.click(`[data-export="${type}"]`);
    const file = await pending;
    const destination = path.join(downloadDir, `paper-${++serial}-${file.suggestedFilename()}`);
    await file.saveAs(destination);
    assert((await file.failure()) === null, `${type} download failed`);
    await page.waitForFunction(() => !document.querySelector('#download-btn').disabled);
    return { filename: file.suggestedFilename(), bytes: fs.readFileSync(destination), destination };
  }
  async function exportJson() {
    return JSON.parse((await download('json')).bytes.toString('utf8'));
  }
  async function importJson(state) {
    const destination = path.join(downloadDir, `paper-import-${++serial}.json`);
    fs.writeFileSync(destination, JSON.stringify(state));
    await page.setInputFiles('#import-file', destination);
    await pause();
  }
  async function geometry() {
    return preview.evaluate((paper) => {
      const rect = paper.getBoundingClientRect();
      const scale = rect.width / paper.offsetWidth;
      const padding = Number.parseFloat(getComputedStyle(paper).paddingBottom);
      const blocks = [...paper.querySelectorAll('header, section')];
      const bottom = Math.max(...blocks.map((block) => block.getBoundingClientRect().bottom));
      return {
        width: paper.offsetWidth,
        height: paper.offsetHeight,
        horizontalOverflow: paper.scrollWidth - paper.clientWidth,
        contentBottom: (bottom - rect.top) / scale,
        remaining: (rect.bottom - bottom) / scale - padding,
        fillState: paper.dataset.fillState,
      };
    });
  }
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await pause();
    const initial = await exportJson();
    await page.click('[data-section="style"]');
    for (const template of ['classic', 'minimal', 'sidebar', 'editorial']) {
      await page.click(`[data-paper-template="${template}"]`);
      await pause();
      for (const lang of ['zh', 'en']) {
        const shownLang = await page.locator('#lang-toggle').getAttribute('data-active-lang');
        if (shownLang !== lang) {
          await page.click('#lang-toggle');
          await pause();
        }
        assert(
          (await preview.getAttribute('data-template')) === template,
          `${template} not applied`,
        );
        assert(
          (await preview.innerText()).includes(initial.profiles[lang].basics.name),
          `${template} lost the ${lang} identity`,
        );
        const dimensions = await geometry();
        assert(Math.abs(dimensions.width - 794) < 2, `${template}/${lang} changed A4 width`);
        assert(dimensions.horizontalOverflow <= 1, `${template}/${lang} overflows horizontally`);
        assert(
          dimensions.height <= 1124,
          `${template}/${lang} demo should fit one A4 page (${dimensions.height}px)`,
        );
      }
      const png = await download('png');
      assert(
        png.bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        `${template} PNG invalid`,
      );
      assert(png.bytes.readUInt32BE(16) === 1588, `${template} PNG lost A4 width`);
      if (template === 'sidebar') {
        const hasRail = await page.evaluate(async (base64) => {
          const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
          const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let railPixels = 0;
          for (let index = 0; index < data.length; index += 4)
            if (data[index] === 238 && data[index + 1] === 243 && data[index + 2] === 246)
              railPixels++;
          bitmap.close();
          return railPixels > 10000;
        }, png.bytes.toString('base64'));
        assert(hasRail, 'sidebar PNG lost its background/layout');
      }
    }

    // The resume-language toggle is independent; the UI button couples both
    // languages when the target profile has content.
    if ((await page.locator('#lang-toggle').getAttribute('data-active-lang')) !== 'zh')
      await page.click('#lang-toggle');
    await page.click('[data-section="basics"]');
    const chinesePreview = await preview.innerText();
    const chineseName = await page.locator('[data-path="basics.name"]').inputValue();
    const uiWasEn = (await page.locator('html').getAttribute('lang')) === 'en';
    if (!uiWasEn) await page.click('#ui-language-btn');
    await pause();
    const englishNavigation = await page.locator('#module-nav').innerText();
    assert(/profile|basic/i.test(englishNavigation), 'English interface navigation missing');
    if (!uiWasEn) {
      assert(
        (await preview.innerText()) !== chinesePreview,
        'UI switch should couple the resume language',
      );
      await page.click('#lang-toggle');
      await pause();
    }
    assert((await preview.innerText()) === chinesePreview, 'Chinese resume content was altered');
    assert(
      (await page.locator('[data-path="basics.name"]').inputValue()) === chineseName,
      'UI language changed the input value',
    );
    await page.reload({ waitUntil: 'networkidle' });
    await pause();
    assert(
      /profile|basic/i.test(await page.locator('#module-nav').innerText()),
      'UI English not persisted',
    );
    assert(
      (await preview.innerText()) === chinesePreview,
      'refresh changed resume language or data',
    );

    // Non-default design must survive the portability format without removing the source photo.
    await page.click('[data-section="style"]');
    await page.click('[data-paper-template="minimal"]');
    await page.click('[data-paper-color="#5b4d73"]');
    await page.locator('#paper-show-photo').uncheck();
    await page.locator('#paper-fill-page').check();
    await pause();
    const styled = await exportJson();
    assert(styled.style.template === 'minimal', 'JSON lost template');
    assert(styled.style.accent.toLowerCase() === '#5b4d73', 'JSON lost accent');
    assert(styled.style.showPhoto === false, 'JSON lost hidden-photo setting');
    assert(styled.style.fillPage === true, 'JSON lost page-fill setting');
    for (const lang of ['zh', 'en']) {
      assert(
        styled.profiles[lang].basics.photo === initial.profiles[lang].basics.photo,
        `${lang} photo deleted`,
      );
      assert(
        styled.profiles[lang].basics.photoOriginal === initial.profiles[lang].basics.photoOriginal,
        `${lang} original deleted`,
      );
    }
    assert((await preview.locator('.resume-photo').count()) === 0, 'hidden photo still rendered');
    const word = await download('word');
    const mediaCount = await page.evaluate(async (base64) => {
      const zip = await window.JSZip.loadAsync(base64, { base64: true });
      return Object.values(zip.files).filter(
        (file) => /^word\/media\//.test(file.name) && !file.dir,
      ).length;
    }, word.bytes.toString('base64'));
    assert(mediaCount === 0, 'editable Word embeds the hidden photo');
    await page.click('[data-paper-template="classic"]');
    await importJson(styled);
    const roundtrip = await exportJson();
    assert(
      JSON.stringify(roundtrip.style) === JSON.stringify(styled.style),
      'JSON import changed style',
    );
    assert(
      (await preview.getAttribute('data-template')) === 'minimal',
      'import did not restore template',
    );
    assert((await preview.locator('.resume-photo').count()) === 0, 'import exposed hidden photo');

    // Print copies must retain standalone template attributes and CSS variables after their id is removed.
    const printMatch = await page.evaluate(() => {
      const source = document.querySelector('#resume-preview');
      const print = document.querySelector('#print-root .resume');
      return (
        print &&
        print.dataset.template === source.dataset.template &&
        print.style.getPropertyValue('--resume-accent') ===
          source.style.getPropertyValue('--resume-accent') &&
        print.querySelectorAll('.resume-photo').length === 0
      );
    });
    assert(printMatch, 'print clone lost design or photo visibility');
    await page.emulateMedia({ media: 'print' });
    assert(
      await page.locator('#print-root').isVisible(),
      'print root is not visible in print media',
    );
    const printedBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    const printedPages = await page.evaluate(async (base64) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      return (await window.PDFLib.PDFDocument.load(bytes)).getPageCount();
    }, printedBytes.toString('base64'));
    assert(printedPages === 1, `print design should fit one A4 page, got ${printedPages}`);
    await page.emulateMedia({ media: 'screen' });

    const filled = await geometry();
    assert(
      ['filled', 'limited'].includes(filled.fillState),
      `unexpected fill state ${filled.fillState}`,
    );
    assert(filled.height <= 1124 && filled.contentBottom <= 1124, 'page fill exceeded A4');
    if (filled.fillState === 'filled')
      assert(
        filled.remaining >= -3 && filled.remaining < 36,
        `page fill leaves ${filled.remaining}px unused`,
      );
    await page.locator('#paper-fill-page').uncheck();
    await pause();
    const natural = await geometry();
    assert(natural.fillState === 'disabled', 'turning fill off did not reset state');
    assert(
      natural.remaining >= filled.remaining - 2,
      'turning fill off did not restore natural spacing',
    );

    // A library selection changes the export source while keeping the active editor entry intact.
    await page.locator('#paper-fill-page').check();
    await pause();
    const activeBefore = await page.evaluate(() => localStorage.getItem('resume-studio.v1.active'));
    await page.click('[data-section="library"]');
    const otherCard = page.locator('.resume-card:not(.is-active)').first();
    await otherCard.locator('.resume-card-open').click();
    await pause();
    const selectedTitle = await page.locator('#document-title').inputValue();
    const selectedTemplate = await preview.getAttribute('data-template');
    const selectedDownload = await download('json');
    const selected = JSON.parse(selectedDownload.bytes.toString('utf8'));
    assert(selected.meta.title === selectedTitle, 'library-only export has wrong title');
    assert(
      (selected.style.template || 'classic') === selectedTemplate,
      'library-only export has wrong template',
    );
    assert(
      selectedDownload.filename.includes(selectedTitle),
      'library export filename has wrong title',
    );
    assert(
      (await page.evaluate(() => localStorage.getItem('resume-studio.v1.active'))) === activeBefore,
      'preview-only selection changed active entry',
    );

    // Leave library mode before importing the long fixture so selected-card preview cannot mask it.
    await otherCard.locator('[data-edit]').click();
    const long = structuredClone(styled);
    long.meta.title = 'Paper overflow fixture';
    long.style.fillPage = true;
    long.profiles.zh.experience = [
      {
        id: 'paper-overflow',
        company: '虚构测试公司',
        role: '测试岗位',
        start: '2020-01',
        end: '2025-01',
        bullets: Array.from(
          { length: 40 },
          (_, i) => `第 ${i + 1} 条测试：${'用于验证超长内容保留并停止自动扩展间距。'.repeat(6)}`,
        ),
      },
    ];
    await importJson(long);
    assert(
      (await preview.getAttribute('data-fill-state')) === 'overflow',
      'long resume should report overflow',
    );
    assert((await geometry()).height > 1124, 'long content was compressed or dropped');
    assert(errors.length === 0, `browser errors: ${errors.join('; ')}`);
    console.log(
      'PASS: four paper templates, independent UI English, design JSON roundtrip, photo visibility, A4 fill and library export',
    );
  } finally {
    await context.close();
  }
}
