// Release screenshots, generated rather than taken by hand.
//
//   node tools/capture.mjs [--video=<id>] [--keep-open] [--only=name,name]
//
// Launches a throwaway Chrome, loads this repo as an unpacked extension, drives
// it through each scenario below, and writes a cropped image per scenario to
// docs/screenshots/<manifest version>/. Repo-only: nothing here ships to users,
// so it costs no install size and the popup never fetches anything remote.
//
// Two things that are not obvious and cost real time to work out:
//
//   * `--load-extension` stopped working in Chrome 137. The supported route for
//     automation is `--enable-unsafe-extension-debugging` plus a remote
//     debugging port, then `Extensions.loadUnpacked` over CDP.
//   * `scheduleWork()` in content.js batches on requestAnimationFrame, which
//     does not fire in a background tab. A backgrounded window means nothing
//     injects and every screenshot comes back as plain YouTube, so the tab is
//     brought to the front before anything is measured.
//
// No dependencies: node's own WebSocket, fetch and child_process only.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_VIDEO = 'vYIYIVmOo3Q'; // a 24/7 live stream, so live chat is present
const PORT = 9500 + Math.floor(Math.random() * 400);

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const VIDEO = flag('video', DEFAULT_VIDEO);
const ONLY = flag('only', '').split(',').filter(Boolean);
const KEEP_OPEN = args.includes('--keep-open');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- CDP ---------------------------------------------------------------------

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  let seq = 0;
  const send = (method, params) =>
    new Promise((res, rej) => {
      const id = ++seq;
      const onMessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id !== id) return;
        ws.removeEventListener('message', onMessage);
        msg.error ? rej(new Error(method + ': ' + msg.error.message)) : res(msg.result);
      };
      ws.addEventListener('message', onMessage);
      ws.send(JSON.stringify({ id, method, params }));
    });
  return { ws, send, close: () => ws.close() };
}

async function evaluate(page, expression) {
  const r = await page.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  }
  return r.result?.value;
}

// --- Scenarios ---------------------------------------------------------------
//
// `where` returns the CSS selector to crop to, or null for the whole viewport.
// `needsChat` scenarios are skipped (loudly) when the stream has no live chat.

const SCENARIOS = [
  {
    name: 'popup',
    surface: 'options',
    viewport: { width: 460, height: 1000 },
    scale: 2,
    format: 'png',
    fullPage: true,
    setup: async (page) => {
      // Pretend an update just landed so the notice is in the shot.
      await evaluate(page, `new Promise(r => chrome.storage.local.set({ lastSeenVersion: '0.0.1' }, r))`);
      await page.send('Page.reload');
      await wait(1200);
    },
  },
  {
    name: 'release-notes',
    surface: 'options',
    viewport: { width: 460, height: 1000 },
    scale: 2,
    format: 'png',
    where: '.changelog',
    pad: 12,
    setup: async (page) => {
      await evaluate(page, `document.querySelector('.changelog details').open = true; 1`);
      await wait(400);
    },
  },
  {
    name: 'windowed-fullscreen',
    surface: 'watch',
    viewport: { width: 1440, height: 810 },
    scale: 1,
    format: 'jpeg',
    setup: (page) => activate(page, { chat: false }),
  },
  {
    name: 'sticky-chat',
    surface: 'watch',
    viewport: { width: 1440, height: 810 },
    scale: 1,
    format: 'jpeg',
    needsChat: true,
    setup: (page) => activate(page, { chat: true }),
  },
  {
    name: 'masthead-reveal',
    surface: 'watch',
    viewport: { width: 1440, height: 810 },
    scale: 2,
    format: 'jpeg',
    where: '#masthead-container',
    pad: 4,
    needsChat: true,
    setup: async (page) => {
      await activate(page, { chat: true });
      // Reach for the top edge the way a person does; the reveal is driven by
      // mousemove, so a synthetic class toggle would not exercise the real path.
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 400 });
      await wait(300);
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 8 });
      await wait(600);
    },
  },
  {
    name: 'settings-panel',
    surface: 'watch',
    viewport: { width: 1440, height: 810 },
    scale: 2,
    format: 'jpeg',
    where: '.ytp-settings-menu',
    pad: 8,
    setup: async (page) => {
      await activate(page, { chat: false });
      await evaluate(
        page,
        `(async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          const gear = document.querySelector('.ytp-settings-button');
          const menu = () => document.querySelector('.ytp-settings-menu');
          if (menu() && getComputedStyle(menu()).display !== 'none') { gear.click(); await wait(600); }
          gear.click();
          await wait(1400);
          menu().querySelector('.wfs-menurow').click();
          await wait(900);
          return 1;
        })()`
      );
    },
  },
  {
    name: 'gear-menu',
    surface: 'watch',
    viewport: { width: 1440, height: 810 },
    scale: 2,
    // The menu is translucent over video, so PNG stores a photograph badly.
    format: 'jpeg',
    where: '.ytp-settings-menu',
    pad: 8,
    setup: async (page) => {
      await activate(page, { chat: false });
      await evaluate(
        page,
        `(async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          const gear = document.querySelector('.ytp-settings-button');
          const menu = () => document.querySelector('.ytp-settings-menu');
          if (menu() && getComputedStyle(menu()).display !== 'none') { gear.click(); await wait(600); }
          gear.click();
          await wait(1200);
          return 1;
        })()`
      );
    },
  },
];

// Enter windowed fullscreen, with live chat open or closed. Clicking the
// injected button rather than setting the class exercises what users do.
function activate(page, { chat }) {
  return evaluate(
    page,
    `(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const frame = document.querySelector('ytd-live-chat-frame#chat');
      if (frame) {
        const collapsed = frame.hasAttribute('collapsed');
        if (collapsed !== !${chat}) {
          const toggle = frame.querySelector('#show-hide-button button');
          if (toggle) { toggle.click(); await wait(4000); }
        }
      }
      if (!document.documentElement.classList.contains('wfs-active')) {
        document.getElementById('wfs-button').click();
        await wait(3000);
      }
      return document.documentElement.className;
    })()`
  );
}

// Between scenarios in a shared tab: close any open menu, leave windowed
// fullscreen, and park the pointer away from the top edge so the next scenario
// does not inherit a revealed masthead.
async function resetWatch(page) {
  await evaluate(
    page,
    `(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const gear = document.querySelector('.ytp-settings-button');
      const menu = document.querySelector('.ytp-settings-menu');
      if (menu && getComputedStyle(menu).display !== 'none') { gear.click(); await wait(700); }
      if (document.documentElement.classList.contains('wfs-active')) {
        document.getElementById('wfs-button').click();
        await wait(2500);
      }
      return 1;
    })()`
  );
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 400 });
  await wait(800);
}

// --- Runner ------------------------------------------------------------------

async function newTab(url) {
  const res = await fetch(`http://localhost:${PORT}/json/new?${url}`, { method: 'PUT' });
  return res.json();
}

async function capture(page, scenario, outDir) {
  // captureBeyondViewport renders the full document, which the popup needs
  // (it is taller than any popup window) and the watch page must not have:
  // content.css sizes the player in `vh`, so growing the capture surface
  // re-lays out the page and every element crop lands somewhere else.
  const beyondViewport = scenario.surface === 'options';

  let clip;
  if (scenario.where) {
    const box = await evaluate(
      page,
      `(() => {
        const el = document.querySelector(${JSON.stringify(scenario.where)});
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const offX = ${beyondViewport} ? scrollX : 0;
        const offY = ${beyondViewport} ? scrollY : 0;
        return { x: r.x + offX, y: r.y + offY, width: r.width, height: r.height };
      })()`
    );
    if (!box || box.width === 0) throw new Error('nothing matched ' + scenario.where);
    const pad = scenario.pad || 0;
    clip = {
      x: Math.max(0, Math.round(box.x - pad)),
      y: Math.max(0, Math.round(box.y - pad)),
      width: Math.round(box.width + pad * 2),
      height: Math.round(box.height + pad * 2),
      scale: scenario.scale,
    };
  } else if (scenario.fullPage) {
    const height = await evaluate(page, `Math.ceil(document.body.getBoundingClientRect().height)`);
    clip = { x: 0, y: 0, width: scenario.viewport.width, height, scale: scenario.scale };
  }

  const shot = await page.send('Page.captureScreenshot', {
    format: scenario.format,
    ...(scenario.format === 'jpeg' ? { quality: 88 } : {}),
    ...(clip ? { clip, captureBeyondViewport: beyondViewport } : {}),
  });
  const file = join(outDir, scenario.name + '.' + (scenario.format === 'jpeg' ? 'jpg' : 'png'));
  const bytes = Buffer.from(shot.data, 'base64');
  writeFileSync(file, bytes);
  return { file, kb: Math.round(bytes.length / 1024) };
}

async function main() {
  const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!chrome) {
    console.error('No Chrome found. Set CHROME_PATH to the executable.');
    process.exit(1);
  }

  const { version } = JSON.parse(await readFile(join(REPO, 'manifest.json'), 'utf8'));
  const outDir = join(REPO, 'docs', 'screenshots', version);
  mkdirSync(outDir, { recursive: true });

  const profile = join(tmpdir(), 'wfyt-capture-' + process.pid);
  const proc = spawn(
    chrome,
    [
      `--user-data-dir=${profile}`,
      '--enable-unsafe-extension-debugging',
      `--remote-debugging-port=${PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore', detached: false }
  );

  const cleanup = () => {
    if (KEEP_OPEN) return;
    try { proc.kill(); } catch {}
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });

  let browser;
  for (let i = 0; i < 40 && !browser; i++) {
    await wait(500);
    try {
      const info = await (await fetch(`http://localhost:${PORT}/json/version`)).json();
      browser = await connect(info.webSocketDebuggerUrl);
    } catch {}
  }
  if (!browser) throw new Error('Chrome never opened a debugging port');

  const { id: extensionId } = await browser.send('Extensions.loadUnpacked', { path: REPO });
  browser.close();
  console.log(`extension ${extensionId} loaded, capturing ${version}`);

  const wanted = SCENARIOS.filter((s) => !ONLY.length || ONLY.includes(s.name));
  const skipped = [];
  // One watch tab for all of them. A cold YouTube load per scenario is slow and,
  // once a few renderers are alive at once, unreliable: the content script was
  // intermittently never injecting in the fifth tab.
  let watch = null;

  const openTab = async (url) => {
    const tab = await newTab(url);
    const page = await connect(tab.webSocketDebuggerUrl);
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    return { tab, page };
  };

  const closeTab = async (open) => {
    open.page.close();
    await fetch(`http://localhost:${PORT}/json/close/${open.tab.id}`).catch(() => {});
  };

  for (const scenario of wanted) {
    let open = null;
    try {
      if (scenario.surface === 'options') {
        open = await openTab(`chrome-extension://${extensionId}/options.html`);
      } else {
        if (!watch) watch = await openTab(`https://www.youtube.com/watch?v=${VIDEO}`);
        open = watch;
      }
      const page = open.page;

      await page.send('Emulation.setDeviceMetricsOverride', {
        ...scenario.viewport,
        deviceScaleFactor: 1,
        mobile: false,
      });
      // rAF is the injection trigger and it does not run in a hidden tab.
      await page.send('Page.bringToFront');
      await wait(1200);

      if (scenario.surface === 'watch') {
        let ready = false;
        for (let i = 0; i < 30 && !ready; i++) {
          ready = await evaluate(page, `!!document.getElementById('wfs-button')`).catch(() => false);
          if (!ready) await wait(1000);
        }
        if (!ready) throw new Error('content script never injected');
        if (scenario.needsChat) {
          const hasChat = await evaluate(page, `!!document.querySelector('ytd-live-chat-frame#chat')`);
          if (!hasChat) {
            skipped.push(`${scenario.name} (no live chat on ${VIDEO})`);
            continue;
          }
        }
        await resetWatch(page);
      }

      if (scenario.setup) await scenario.setup(page);
      await wait(600);
      const { file, kb } = await capture(page, scenario, outDir);
      console.log(`  ${scenario.name.padEnd(20)} ${String(kb).padStart(5)} KB  ${file.slice(REPO.length + 1)}`);
    } catch (e) {
      skipped.push(`${scenario.name} (${e.message})`);
    } finally {
      if (open && open !== watch) await closeTab(open);
    }
  }
  if (watch) await closeTab(watch);

  if (skipped.length) {
    console.log('\nnot captured:');
    for (const s of skipped) console.log('  - ' + s);
  }
  if (KEEP_OPEN) console.log(`\nChrome left open on port ${PORT}; profile at ${profile}`);
  cleanup();
  process.exit(skipped.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
