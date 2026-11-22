import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const ROUTES = ['/', '/method/', '/contact/', '/notes/', '/legal/'];
const ALL = [...ROUTES, '/cv/', '/in/', '/no-such-page/'];
const site = parse(readFileSync('src/data/site.yml', 'utf8'));
const method = JSON.parse(readFileSync('src/data/method.json', 'utf8'));
const evidenceIds = (parse(readFileSync('src/data/evidence.yml', 'utf8')) as { id: string }[]).map((r) => r.id);
const projects = (parse(readFileSync('src/data/projects.yml', 'utf8')) as any[]).sort((a, b) => a.order - b.order);

const blocks = (page: Page) => page.$$eval('[data-block]', (els) => els.map((e) => e.getAttribute('data-block')));

test('[REQ-001] Home shows its blocks in the specified order', async ({ page }) => {
  await page.goto('/');
  // The upstream list is absent while empty (REQ-004).
  expect(await blocks(page)).toEqual(['header', 'intro', 'mark', 'method-summary', 'projects', 'footer']);
});

test('[REQ-002] each project card shows name, pitch, one number, release and two links', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('[data-project]');
  await expect(cards).toHaveCount(projects.length);
  for (const [i, p] of projects.entries()) {
    const card = cards.nth(i);
    await expect(card.locator('h3')).toContainText(p.portfolio.name);
    await expect(card.locator('.pitch')).toContainText(p.portfolio.pitch.slice(0, 20));
    await expect(card.locator('[data-headline]')).toHaveCount(1);
    await expect(card).toContainText(p.portfolio.release);
    await expect(card.getByRole('link', { name: 'Repository' })).toHaveAttribute('href', p.portfolio.repo_url);
    await expect(card.getByRole('link', { name: 'Example pull request' })).toHaveAttribute('href', p.portfolio.example_pr_url);
  }
});

test('[REQ-020] the card number is the headline value and links to its source', async ({ page }) => {
  await page.goto('/');
  for (const [i, p] of projects.entries()) {
    const h = page.locator('[data-project]').nth(i).locator('[data-headline]');
    await expect(h.locator('.v')).toHaveText(p.headline.value);
    await expect(h.locator('.l')).toContainText(p.headline.label.split(' ')[0]);
    await expect(h).toHaveAttribute('href', p.headline.source_url);
  }
});

test('[REQ-022] a provenance tag shows each model, effort and session count from the data, and none when the data is empty', async ({ page }) => {
  await page.goto('/');
  for (const [i, p] of projects.entries()) {
    const tags = await page.locator('[data-project]').nth(i).locator('[data-prov]').allInnerTexts();
    expect(tags).toEqual(p.models.map((m: any) => `${m.name} · ${m.sessions} ${m.sessions === 1 ? 'session' : 'sessions'}`));
  }
  expect(projects.some((p) => p.models.length === 0)).toBe(true); // the card without models has no tag
});

test('[REQ-003] the introduction is two sentences', async ({ page }) => {
  await page.goto('/');
  const text = await page.locator('[data-block=intro]').innerText();
  expect(text.split('.').map((s) => s.trim()).filter(Boolean)).toHaveLength(2);
  await expect(page.locator('h1')).toHaveCount(1);
});

test('[REQ-004] with no upstream pull requests there is no upstream block', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-block=upstream]')).toHaveCount(0);
  await expect(page.getByText('Accepted by other projects')).toHaveCount(0);
});

test('[REQ-006] Contact lists the channels in the data file and collects no data', async ({ page }) => {
  await page.goto('/contact/');
  const hrefs = await page.locator('main a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs).toEqual(site.contact.map((c: any) => c.href));
  await expect(page.locator('form, iframe, input, textarea')).toHaveCount(0);
});

test('[REQ-006] the email is the first and largest link, and the location line comes from the data file', async ({ page }) => {
  await page.goto('/contact/');
  const first = page.locator('main a').first();
  await expect(first).toHaveClass(/mail/);
  await expect(first).toHaveAttribute('href', /^mailto:/);
  await expect(page.locator('.where')).toHaveText(site.location);
});

test('[REQ-007] Legal has the imprint and privacy sections', async ({ page }) => {
  await page.goto('/legal/');
  await expect(page.locator('section#imprint')).toHaveCount(1);
  await expect(page.locator('section#privacy')).toHaveCount(1);
});

for (const route of ALL) {
  test(`[REQ-008] the footer links the imprint, privacy and contact on ${route}`, async ({ page }) => {
    await page.goto(route);
    const f = page.locator('footer');
    await expect(f.getByRole('link', { name: 'Imprint' })).toHaveAttribute('href', '/legal/#imprint');
    await expect(f.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/legal/#privacy');
    await expect(f.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact/');
  });

  test(`[REQ-011] the header names the owner and marks the current page on ${route}`, async ({ page }) => {
    await page.goto(route);
    const header = page.locator('header');
    await expect(header.locator('a.name')).toHaveAttribute('href', '/');
    await expect(header.locator('a.name')).toHaveText('Chris Ampadu');
    await expect(header.getByRole('link', { name: 'Method' })).toHaveAttribute('href', '/method/');
    await expect(header.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact/');
    const current = await header.locator('[aria-current=page]').count();
    expect(current).toBe(['/', '/method/', '/contact/', '/notes/'].includes(route) ? 1 : 0);
  });

  test(`[REQ-012] one h1, a title, a description, a language and a canonical link on ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    expect((await page.title()).length).toBeGreaterThan(0);
    const d = await page.locator('meta[name=description]').getAttribute('content');
    expect(d!.length).toBeGreaterThanOrEqual(50);
    expect(d!.length).toBeLessThanOrEqual(160);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    await expect(page.locator('link[rel=canonical]')).toHaveCount(1);
  });

  test(`[REQ-024] no percent sign in the main content of ${route}`, async ({ page }) => {
    await page.goto(route);
    expect(await page.locator('main').innerText()).not.toContain('%');
  });

  test(`[REQ-045] no em dash on ${route}`, async ({ page }) => {
    await page.goto(route);
    expect(await page.locator('body').innerText()).not.toContain('—');
  });

  test(`[REQ-030] every number in the main content of ${route} sits inside an element that names its source`, async ({ page }) => {
    await page.goto(route);
    const problems = await page.evaluate(({ ids, slugs, rows }) => {
      const bad: string[] = [];
      const allowed = (v: string) => v === 'upstream.json' || v === 'mark.json' || v === 'site.yml' || v === 'content' || v === 'label'
        || (v.startsWith('method.json#') && ids.includes(v.slice(12))) || (v.startsWith('projects.yml#') && slugs.includes(v.slice(13)))
        || (v.startsWith('evidence.yml#') && rows.includes(v.slice(13))) || ['note#count', 'note#claims', 'note#rows'].includes(v);
      const SECTIONING = new Set(['MAIN', 'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FOOTER', 'FIGURE', 'DETAILS', 'BODY']);
      const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = (n.textContent ?? '').trim();
        if (!/\d/.test(text)) continue;
        const el = n.parentElement!.closest('[data-src]') as HTMLElement | null;
        if (!el) { bad.push(`no source: ${text}`); continue; }
        const v = el.getAttribute('data-src')!;
        // The source sits on the element that holds the number: not on a section, and not around a heading (5.6 F-03).
        if (SECTIONING.has(el.tagName.toUpperCase())) bad.push(`source on a <${el.tagName.toLowerCase()}>: ${text}`);
        if (el.querySelector('h1, h2, h3, h4, h5, h6')) bad.push(`source around a heading: ${text}`);
        if (!allowed(v)) bad.push(`value not allowed (${v}): ${text}`);
        // label is for the ordinal of a fixed sequence only: one or two digits at the start, no other digit.
        if (v === 'label' && !/^\d{1,2}(\D*)$/.test((el.textContent ?? '').trim())) bad.push(`label on more than an ordinal: ${text}`);
      }
      return bad;
    }, { ids: [...method.stats.map((s: any) => s.id), 'recent', 'counts', 'cutoff'], slugs: projects.map((p: any) => p.slug), rows: evidenceIds });
    expect(problems).toEqual([]);
  });

  test(`[REQ-043] the first Tab reaches the skip link on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.keyboard.press('Tab');
    const first = page.locator(':focus');
    await expect(first).toHaveText('Skip to content');
    await expect(first).toBeVisible();
    await expect(first).toHaveAttribute('href', '#main');
  });

  test(`[REQ-040] ${route} shows the same main text with scripts off`, async ({ browser, baseURL }) => {
    const on = await browser.newPage();
    await on.goto(baseURL + route);
    // The pause button is the one thing a script adds to the text: it controls motion, which scripts may add (REQ-040).
    await on.addStyleTag({ content: '[data-motion]{display:none!important}' });
    const withJs = await on.locator('main').innerText();
    await on.close();
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const off = await ctx.newPage();
    await off.goto(baseURL + route);
    expect(await off.locator('main').innerText()).toBe(withJs);
    await ctx.close();
  });
}

test('[REQ-012] every route has its own title', async ({ page }) => {
  const titles: string[] = [];
  for (const r of ALL) {
    await page.goto(r);
    titles.push(await page.title());
  }
  expect(new Set(titles).size).toBe(titles.length);
});

for (const route of ['/cv/', '/in/']) {
  test(`[REQ-010] ${route} has Home's content, a canonical link to Home, noindex, and is not in the sitemap`, async ({ page }) => {
    await page.goto('/');
    const home = await page.locator('main').innerText();
    await page.goto(route);
    expect(await page.locator('main').innerText()).toBe(home);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://ampaduchris.github.io/');
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex');
    const sitemap = readFileSync('dist/sitemap-0.xml', 'utf8');
    expect(sitemap).not.toContain(`ampaduchris.github.io${route}`);
  });
}

test('[REQ-009] an unknown path gives status 404, a link Home, the shell and noindex', async ({ page }) => {
  const res = await page.goto('/no-such-page/');
  expect(res!.status()).toBe(404);
  await expect(page.locator('main').getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('header')).toHaveCount(1);
  await expect(page.locator('footer')).toHaveCount(1);
});

test('[REQ-026] every date is a time element in the specified form', async ({ page }) => {
  await page.goto('/');
  const times = await page.locator('time').evaluateAll((ts) => ts.map((t) => [t.textContent, t.getAttribute('datetime')]));
  expect(times.length).toBeGreaterThan(0);
  for (const [text, dt] of times) {
    expect(text).toMatch(/^\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/);
    expect(Number.isNaN(Date.parse(dt!))).toBe(false);
  }
});

for (const width of [320, 375, 768, 1280]) {
  test(`[REQ-041] no route scrolls sideways at ${width} pixels`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const r of ALL) {
      await page.goto(r);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(sw, r).toBeLessThanOrEqual(cw);
    }
  });
}

test('[REQ-042] the page opens light, the toggle switches and the choice holds on the next page', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.goto(baseURL + '/');
  expect(await bg()).toBe('rgb(255, 255, 255)');
  const toggle = page.locator('[data-theme-toggle]');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-label', 'Switch to the dark scheme');
  await toggle.click();
  expect(await bg()).toBe('rgb(7, 11, 20)');
  await expect(toggle).toHaveAttribute('aria-label', 'Switch to the light scheme');
  await page.goto(baseURL + '/contact/');
  expect(await bg()).toBe('rgb(7, 11, 20)');
  await ctx.close();
  const off = await browser.newContext({ javaScriptEnabled: false });
  const p2 = await off.newPage();
  await p2.goto(baseURL + '/');
  await expect(p2.locator('[data-theme-toggle]')).toBeHidden();
  await off.close();
});

test('[REQ-034] no route makes a request to another origin, in either scheme', async ({ page, baseURL }) => {
  const origins = new Set<string>();
  page.on('request', (r) => { if (r.url().startsWith('http')) origins.add(new URL(r.url()).origin); });
  for (const r of ALL) {
    await page.goto(r);
    const t = page.locator('[data-theme-toggle]');
    await t.click();
    await page.waitForLoadState('networkidle');
    await t.click();
  }
  expect([...origins]).toEqual([new URL(baseURL!).origin]);
});

test('[REQ-036] no cookie and no session storage; one local key only after the toggle', async ({ page }) => {
  const state = () => page.evaluate(() => ({ session: sessionStorage.length, local: Object.entries(localStorage), cookie: document.cookie }));
  for (const r of ALL) {
    await page.goto(r);
    const s = await state();
    expect(s).toEqual({ session: 0, local: [], cookie: '' });
  }
  expect(await page.context().cookies()).toEqual([]);
  await page.goto('/');
  await page.locator('[data-theme-toggle]').click();
  expect((await state()).local).toEqual([['theme', 'dark']]);
  await page.locator('[data-theme-toggle]').click();
  expect((await state()).local).toEqual([]);
});
