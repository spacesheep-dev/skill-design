#!/usr/bin/env node
// Makes design/assets/shepherd.html from design/assets/base.html: the page a Shepherd turn copies whole, since
// it has no shell for fold.js and writes a blank page as one document (references/shepherd.md). It keeps
// base.html's metas, bar, tokens, sections and Tweaks, with a slim switcher (tabs, Back, zoom, Use this ·
// Another round, the card menus) and nothing else: no Export, device row, rounds, kit parts or layout check.
// Its switcher spans keep their marks, so `fold.js kit` later brings such a page up to the full starter.
//   node tools/shepherd.js           writes it
//   node tools/shepherd.js --check   exits 1 when the file isn't what base.html makes
const fs = require("fs");
const path = require("path");

const ASSETS = path.join(__dirname, "..", "design", "assets");
const OUT = path.join(ASSETS, "shepherd.html");

// The slim switcher. Each run of the page's scripts (a live push runs them again) replaces the last run's
// functions; the document's listeners go in once and call the newest.
const SWITCHER_JS = `(() => {
  const all = () => [...document.querySelectorAll('section.direction:not([data-view-of])')];
  const label = (d) => d.dataset.ssLabel || d.dataset.ssId || '';
  const byId = (id) => !!id && (document.getElementById(id) || document.querySelector('[data-ss-id="' + CSS.escape(id) + '"]'));
  const dirAt = (at) => at && all().find((d) => d === at || d.contains(at));
  const canvas = () => !!document.querySelector('meta[name="ss-canvas"][content="on"]');
  const open = (d) => { history.replaceState(null, '', '#' + encodeURIComponent(d.dataset.ssId)); show(); dispatchEvent(new HashChangeEvent('hashchange')); };
  function pick() {
    let id = location.hash.slice(1);
    try { id = decodeURIComponent(id); } catch {}
    const dirs = all();
    return dirAt(byId(id)) || dirs.find((d) => d.hasAttribute('data-default')) || dirs[0];
  }
  function pills() {
    document.querySelectorAll('.use-this').forEach((u) => {
      const d = all().find((x) => 'Use ' + label(x) === u.dataset.ssSay), on = !!d && d.hasAttribute('data-chosen');
      u.toggleAttribute('data-chosen', on);
      u.disabled = on;
    });
  }
  function frame() {
    const c = (window.ss && window.ss.canvas) || {}, q = (s) => document.querySelector(s);
    const back = q('.frame-back'), zoom = q('.frame-zoom'), use = q('.frame-use'), round = q('.frame-round');
    if (back) back.hidden = !c.open;
    if (zoom) { zoom.hidden = !canvas() || !!c.open || typeof c.zoom !== 'number'; zoom.textContent = Math.round((c.zoom || 1) * 100) + '%'; }
    const d = c.open && dirAt(byId(c.open)), on = !!d && all().length > 1;
    if (use) {
      use.hidden = !on;
      if (on) { use.dataset.ssSay = use.title = 'Use ' + label(d); use.toggleAttribute('data-chosen', d.hasAttribute('data-chosen')); use.disabled = d.hasAttribute('data-chosen'); }
    }
    if (round) { round.hidden = !on; if (on) round.dataset.ssSay = round.title = 'Another round of ' + label(d); }
    pills();
  }
  function show() {
    const d = pick(), tabs = document.querySelector('.switcher-tabs'), line = document.querySelector('.switcher-line');
    all().forEach((x, i) => {
      x.classList.toggle('on', x === d);
      if (tabs && tabs.children[i]) tabs.children[i].setAttribute('aria-selected', String(x === d));
    });
    if (line && d && line.textContent !== (d.dataset.line || '')) line.textContent = d.dataset.line || '';
    frame();
  }
  function draw() {
    const tabs = document.querySelector('.switcher-tabs');
    if (tabs) tabs.replaceChildren(...all().map((d) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.textContent = label(d);
      if (d.hasAttribute('data-chosen')) b.dataset.chosen = '';
      b.addEventListener('click', () => open(d));
      return b;
    }));
    show();
  }
  const stale = () => {
    const t = document.querySelector('.switcher-tabs'), dirs = all();
    return !!t && (t.children.length !== dirs.length || dirs.some((d, i) => t.children[i].textContent !== label(d)
      || t.children[i].hasAttribute('data-chosen') !== d.hasAttribute('data-chosen')));
  };
  window.ssFrame = frame;
  window.ssShow = show;
  window.ssPillOf = (u) => all().find((x) => 'Use ' + label(x) === u.dataset.ssSay);
  if (!window.ssSlimHeard) {
    window.ssSlimHeard = true;
    document.addEventListener('ss:canvas', () => window.ssFrame());
    addEventListener('hashchange', () => window.ssShow());
    document.addEventListener('click', (e) => {
      const t = e.target && e.target.closest ? e.target : null;
      if (!t) return;
      const b = t.closest('.menu-open');
      document.querySelectorAll('.card-menu .menu:not([hidden])').forEach((m) => { if (m.previousElementSibling !== b) { m.hidden = true; m.previousElementSibling.setAttribute('aria-expanded', 'false'); } });
      if (b) { const m = b.nextElementSibling; m.hidden = !m.hidden; b.setAttribute('aria-expanded', String(!m.hidden)); return; }
      const u = t.closest('.use-this'), d = u && window.ssPillOf(u);
      if (d) { history.replaceState(null, '', '#' + encodeURIComponent(d.dataset.ssId)); dispatchEvent(new HashChangeEvent('hashchange')); }
    }, true);
  }
  if (window.ssSlimWatch) window.ssSlimWatch.disconnect();
  window.ssSlimWatch = new MutationObserver(() => { if (stale()) draw(); else pills(); });
  window.ssSlimWatch.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ss-label', 'data-line', 'data-ss-id', 'data-chosen'] });
  draw();
})();`;

// The questions card: turn 1 writes it first in the page, so it shows within seconds while the rest streams in, with
// the turn's own questions in place of these two. Pinned (data-ss-canvas="pin"), it sits at screen size above the
// canvas. While it shows, the bar, the frames and the canvas's labels are hidden: there is nothing in them yet.
// Its button stays off until the page's script has run, which is the turn's last write, so an answer never lands
// while the turn still writes; then it says the answers in one tap (data-ss-say). Turn 2 hides it.
const QUESTIONS_CSS = `.ss-questions{position:relative;z-index:2;box-sizing:border-box;width:min(560px,calc(100% - 24px));max-height:calc(100svh - 120px);overflow:auto;margin:12px auto;padding:20px;display:grid;gap:18px;background:Canvas;color:CanvasText;border:1px solid color-mix(in srgb,CanvasText 18%,transparent);border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.16);font:15px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:light dark;}
.ss-questions[hidden]{display:none;}
.ss-questions h2{margin:0;font-size:19px;line-height:1.25;}
.ss-questions p{margin:-10px 0 0;color:color-mix(in srgb,CanvasText 62%,transparent);}
.ss-questions fieldset{display:flex;flex-wrap:wrap;gap:8px;min-width:0;margin:0;padding:0;border:0;}
.ss-questions legend{padding:0 0 8px;font-weight:600;}
.ss-questions label{position:relative;display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border:1px solid color-mix(in srgb,CanvasText 28%,transparent);border-radius:8px;cursor:pointer;}
.ss-questions label:has(input:checked){background:CanvasText;color:Canvas;border-color:CanvasText;}
.ss-questions label:has(input:focus-visible),.ss-questions :is(input[type="text"],.ss-start):focus-visible{outline:2px solid #4f46e5;outline-offset:2px;}
.ss-questions label input{position:absolute;opacity:0;pointer-events:none;}
.ss-questions input[type="text"]{flex:1 1 160px;min-height:44px;padding:0 12px;border:1px solid color-mix(in srgb,CanvasText 28%,transparent);border-radius:8px;background:transparent;color:inherit;font:inherit;}
.ss-questions :disabled{cursor:default;}
.ss-start{min-height:48px;border:0;border-radius:8px;background:#4f46e5;color:#fff;font:600 16px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;}
.ss-start:disabled{opacity:.62;}
.ss-questions .ss-why{margin:-6px 0 0;color:light-dark(#b42318,#ff9b8f);}
.ss-questions .ss-why:empty{display:none;}
body:has(>.ss-questions:not([hidden])) :is(.switcher,section.direction,ss-canvas-stage,[data-ss-canvas-stage],[data-ss-canvas-lift],.ss-canvas-label,.ss-canvas-section,.ss-canvas-chip,.ss-canvas-hint){visibility:hidden;}`;
const QUESTIONS = `<div class="ss-questions no-print" data-ss-canvas="pin" data-ss-id="design-questions" data-ss-comments="off" data-ss-react="off">
  <h2>A few choices before I draw</h2>
  <p>My picks are chosen. Change any, then press Start designing.</p>
  <fieldset><legend>How should it feel?</legend>
    <label><input type="radio" name="look" value="Warm and homely" checked>Warm and homely</label>
    <label><input type="radio" name="look" value="Clean and modern">Clean and modern</label>
    <label><input type="radio" name="look" value="Bold and playful">Bold and playful</label>
  </fieldset>
  <fieldset><legend>What must it show?</legend>
    <label><input type="checkbox" name="must" value="Opening hours" checked>Opening hours</label>
    <label><input type="checkbox" name="must" value="Prices">Prices</label>
    <input type="text" name="must" aria-label="Something else it must show" placeholder="Or say what" maxlength="60">
  </fieldset>
  <button type="button" class="ss-start" data-ss-say="" disabled>Getting ready…</button>
</div>`;
// Pressed, the card waits for the design. A tap the viewer greys (it can't take a say now) leaves it open with the
// viewer's reason, and a say it refuses (ss:say-refused) opens it again with the picks kept and the reason under them.
const QUESTIONS_JS = `/* questions: start */
(() => {
  const card = document.querySelector('.ss-questions'), go = card && card.querySelector('.ss-start');
  if (!go) return;
  const sent = () => card.dataset.sent !== undefined;
  const say = () => 'Start designing with my answers. ' + [...card.querySelectorAll('fieldset')].map((f) => {
    const a = [...f.querySelectorAll('input:checked')].map((i) => i.value), t = f.querySelector('input[type="text"]');
    if (t && t.value.trim()) a.push(t.value.trim());
    return (f.querySelector('legend')?.textContent || '').trim() + ' ' + (a.join(', ') || 'your pick');
  }).join(' · ');
  // The viewer sends the line only while the button shows it (its title), and puts a refusal's reason there
  // for a moment: until the title is the line again, the button stays off, so a tap can't only fill the chat box.
  const ready = () => { if (!sent()) go.disabled = go.getAttribute('aria-disabled') !== 'true' && go.title !== go.dataset.ssSay; };
  const set = () => {
    if (sent()) return;
    const l = say();
    if (go.dataset.ssSay !== l) { go.dataset.ssSay = l; if (go.hasAttribute('data-ss-title')) go.setAttribute('data-ss-title', l); else go.title = l; }
    ready();
  };
  if (!sent()) go.textContent = 'Start designing';
  const lock = (on, why) => {
    if (on) card.dataset.sent = ''; else delete card.dataset.sent;
    card.querySelectorAll('input, .ss-start').forEach((i) => { i.disabled = on; });
    let w = card.querySelector('.ss-why');
    if (!w) { w = document.createElement('p'); w.className = 'ss-why'; w.setAttribute('role', 'status'); go.before(w); }
    w.textContent = why || '';
    go.textContent = on ? (window.parent !== window ? 'Designing… the directions come next' : 'Copied: paste it in the chat') : 'Start designing';
  };
  if (!card.ssWired) {
    card.ssWired = true;
    card.addEventListener('input', set);
    card.addEventListener('change', set);
    card.addEventListener('click', (e) => {
      if (!e.target.closest || !e.target.closest('.ss-start') || sent()) return;
      const l = go.dataset.ssSay;
      if (go.getAttribute('aria-disabled') !== 'true' && go.title !== l) { e.stopPropagation(); ready(); return; }
      setTimeout(() => {
        if (go.getAttribute('aria-disabled') === 'true') { lock(false, go.title || 'Not sent. Try again in a moment.'); return; }
        lock(true);
        if (window.parent === window) navigator.clipboard?.writeText(l).catch(() => prompt('Copy this into the chat', l));
      }, 0);
    });
    card.addEventListener('ss:say-refused', (e) => {
      lock(false, (e.detail && e.detail.why) || 'Not sent. Press Start designing again.');
      set();
      setTimeout(ready, 1600);
    });
    if (window.MutationObserver) new window.MutationObserver(ready).observe(go, { attributes: true, attributeFilter: ['title', 'aria-disabled'] });
  }
  set();
})();
/* questions: end */`;

const HEADER = `<!--
  Design's page for a Shepherd turn: references/shepherd.md says what to change. Copy everything else as it is.
  The questions card comes first, so it shows while the rest of the page is still being written.
  Made from base.html by tools/shepherd.js.
-->`;

// CSS's top-level statements (a rule, or an at-rule with its block), comments gone.
function statements(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) { out.push(css.slice(start, i + 1).trim()); start = i + 1; }
  }
  return out.filter(Boolean);
}
const tight = (s) => s.replace(/\s+/g, " ").replace(/\s*([{};])\s*/g, "$1").replace(/([:,]) (?=[^"]*(?:"[^"]*"[^"]*)*$)/g, "$1").trim();
// What the slim bar leaves out: Export, the device row, rounds and views. A rule that only counts directions
// (:not([data-view-of])) stays: it keeps the card menu off the drawing and hidden for a single direction.
const DROP = /export|switcher-views|(?<!:not\()\[data-view-of|data-older|rounds|\.round\b|data-round|data-version-of/;
function slimCss(css) {
  return statements(css).map((s) => {
    if (!s.startsWith("@")) return DROP.test(s.slice(0, s.indexOf("{"))) ? "" : tight(s);
    const head = s.slice(0, s.indexOf("{")), inner = statements(s.slice(s.indexOf("{") + 1, s.lastIndexOf("}")))
      .filter((r) => !DROP.test(r.slice(0, r.indexOf("{"))));
    return inner.length ? tight(head) + "{" + inner.map(tight).join("") + "}" : "";
  }).filter(Boolean).join("\n");
}
// A script with its comments gone: whole-line ones, block ones, and those after code at a line's end.
const bare = (js) => js.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/([;{}])\s+\/\/ .*$/, "$1"))
  .filter((l) => l.trim() && !/^\s*\/\//.test(l)).map((l) => l.trim()).join("\n");

function make(base) {
  const span = (text, at) => {
    const a = text.indexOf("/* switcher: start */", at), b = text.indexOf("/* switcher: end */", a);
    if (a < 0 || b < 0) throw new Error("base.html has no switcher span");
    return [a, b + "/* switcher: end */".length];
  };
  const head = base.slice(base.indexOf("<html"), base.indexOf("<style>"));
  const style = base.slice(base.indexOf("<style>") + 7, base.indexOf("</style>"));
  const [sa, sb] = span(style, 0);
  const controlsCss = style.slice(sb, style.indexOf("/* shared:"));
  const css = `/* switcher: start */\n${slimCss(style.slice(sa, sb))}\n/* switcher: end */\n${slimCss(controlsCss)}`;
  const body = base.slice(base.indexOf("<body>"));
  const nav = body.slice(body.indexOf("<nav"), body.indexOf("</nav>") + 6)
    .replace(/\s*<!-- controls:[\s\S]*?-->/, "")
    .replace(/\s*<div class="export no-print">[\s\S]*?<\/p><\/div>/, "")
    .replace(/\s*<div class="switcher-views"[^>]*><\/div>/, "");
  const tokens = body.slice(body.indexOf("<style>", body.indexOf("</nav>")), body.indexOf("</style>", body.indexOf("</nav>")) + 8);
  const sections = [...body.matchAll(/^<section class="direction"[\s\S]*?^<\/section>$/gm)].map((m) => m[0]);
  const draw = base.match(/function ssDraw\(fn\)[^\n]*/)[0];
  const script = base.slice(base.lastIndexOf("<script>") + 8, base.lastIndexOf("</script>"));
  const controls = script.slice(script.indexOf("/* controls:"), script.indexOf("/* kit:"));
  const js = `/* switcher: start */\n${SWITCHER_JS.split("\n").map((l) => l.trim()).join("\n")}\n/* switcher: end */\n${bare(controls)}`;
  for (const [what, ok] of [["metas", /ss-canvas/.test(head)], ["nav", /switcher-row/.test(nav)], ["tokens", /direction-first/.test(tokens)], ["sections", sections.length === 3], ["controls", /function ssControls/.test(controls)]])
    if (!ok) throw new Error(`base.html: its ${what} weren't found`);
  return `<!DOCTYPE html>\n${HEADER}\n${head}<style>\n${QUESTIONS_CSS}\n</style>\n</head>\n<body>\n\n${QUESTIONS}\n\n<style>\n${css}\n</style>\n\n${nav}\n\n${tokens}\n\n${sections.join("\n\n")}\n\n<script>\n${draw}\n${js}\n${QUESTIONS_JS.split("\n").map((l) => l.trim()).join("\n")}\n</script>\n<!-- design: end -->\n</body>\n</html>\n`;
}

module.exports = { make };
if (require.main === module) {
  const page = make(fs.readFileSync(path.join(ASSETS, "base.html"), "utf8"));
  if (process.argv.includes("--check")) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : null;
    if (now !== page) { console.error("design/assets/shepherd.html isn't what base.html makes: run node tools/shepherd.js"); process.exit(1); }
    console.log(`shepherd.html is current (${[...page].length} characters)`);
  } else {
    fs.writeFileSync(OUT, page);
    console.log(`wrote design/assets/shepherd.html (${[...page].length} characters)`);
  }
}
