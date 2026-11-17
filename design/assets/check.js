#!/usr/bin/env node
// Every check the source can decide, so neither the lead nor a helper writes a check script.
// It only reads, in the folder holding work/ and draw/:
//
//   node check.js -C <folder>          every direction, then the page as a whole
//   node check.js -C <folder> <slug>   one direction (a helper's closing check)
//
// It reads work/index.html, each direction's parts (draw/<slug>/*.html, else draw/<slug>.html, else
// its section of the page) and draw/BRIEF.md, whose lines `fact: …` must show in every direction,
// `not: …` in none, and `ask: …` (the request) never six words in a row; nor may any direction's own
// line (its data-line, what the direction is for). It prints one line per
// failure with the file and line to edit, or "all pass". What it can't decide is the look: contrast,
// hierarchy, fit, what a picture shows.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const args = process.argv.slice(2);
if (args[0] === "-C") {
  try { process.chdir(args[1]); } catch { console.error(`check: no folder ${args[1]}`); process.exit(2); }
  args.splice(0, 2);
}
const only = args[0];
// Only files inside the folder, never through a link (lstat sees a link as a link and doesn't follow it).
const ROOT = fs.realpathSync(".");
function within(p) {
  const abs = path.resolve(ROOT, p);
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return false;
  let at = ROOT;
  for (const step of path.relative(ROOT, abs).split(path.sep).filter(Boolean)) {
    at = path.join(at, step);
    let st;
    try { st = fs.lstatSync(at); } catch { return true; }
    if (st.isSymbolicLink()) return false;
  }
  return true;
}
const skipped = new Set();
const read = (f) => {
  if (!within(f)) { if (!skipped.has(f)) console.error(`check: skipped ${f}: it is a link or outside ${ROOT}`); skipped.add(f); return null; }
  try { return fs.readFileSync(f, "utf8"); } catch { return null; }
};
const skip = (f) => { if (!skipped.has(f)) console.error(`check: skipped ${f}: it is a link or outside ${ROOT}`); skipped.add(f); };
const isDir = (d) => { if (!within(d)) { skip(d); return false; } return fs.existsSync(d) && fs.lstatSync(d).isDirectory(); };
function htmlIn(d) {
  const all = (isDir(d) ? fs.readdirSync(d, { withFileTypes: true }) : []).filter((e) => e.name.endsWith(".html"));
  for (const e of all) if (!e.isFile()) skip(`${d}/${e.name}`);
  return all.filter((e) => e.isFile()).map((e) => e.name).sort();
}
const page = read("work/index.html");
if (page === null) { console.error("check: no work/index.html here (give -C the folder holding work/ and draw/)"); process.exit(2); }

const CONTROLS = new Set(["a", "button", "input", "label", "select", "textarea", "summary", "option"]);
const NEUTRAL = /^(#fff|#ffffff|#000|#000000|white|black|transparent|currentcolor|inherit|initial|unset|none|rgba?\(\s*(0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)\b[^)]*\))$/i;
const lineAt = (text, i) => text.slice(0, i).split("\n").length;
const fails = [];
const fail = (dir, where, msg) => fails.push({ dir, where, msg });

// The page's directions: each <section class="direction" data-ss-id="direction-<slug>">, nesting counted. A
// device view is one too, its own frame, with data-view-of="<its direction's slug>" (of).
function directions(text) {
  const out = [];
  const open = /<section\b[^>]*class="[^"]*\bdirection\b[^"]*"[^>]*>/g;
  let m;
  while ((m = open.exec(text))) {
    const id = (m[0].match(/data-ss-id="direction-([a-z0-9-]+)"/) || [])[1];
    if (!id) continue;
    let depth = 1, i = m.index + m[0].length;
    const tag = /<(\/?)section\b[^>]*>/g;
    tag.lastIndex = i;
    let t;
    while (depth && (t = tag.exec(text))) depth += t[1] ? -1 : 1;
    const end = t ? t.index + t[0].length : text.length;
    out.push({ slug: id, start: m.index, end, of: attrs(m[0].slice(8, -1))["data-view-of"] || "" });
    open.lastIndex = end;
  }
  return out;
}

// A direction's sources: its part files, else its one file, else its slice of the page.
function sources(d) {
  const dir = `draw/${d.slug}`;
  if (isDir(dir)) {
    const files = htmlIn(dir);
    if (files.length) return files.map((f) => ({ file: path.join(dir, f), text: read(path.join(dir, f)) || "", base: 0 }));
  }
  const one = read(`draw/${d.slug}.html`);
  if (one) return [{ file: `draw/${d.slug}.html`, text: one, base: 0 }];
  return [{ file: "work/index.html", text: page.slice(d.start, d.end), base: lineAt(page, d.start) - 1 }];
}

// Blocks of script and style, so tag checks skip them and CSS and script checks get them.
function split(text) {
  const blocks = [];
  const re = /<(script|style)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(text))) blocks.push({ kind: m[1].toLowerCase(), start: m.index, end: m.index + m[0].length, body: m[2], bodyAt: m.index + m[0].indexOf(">") + 1 });
  return blocks;
}
const inside = (blocks, i) => blocks.some((b) => i >= b.start && i < b.end);
const attrs = (s) => { const a = {}; s.replace(/([:\w-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g, (_, k, __, d, q, u) => { a[k.toLowerCase()] = d ?? q ?? u ?? ""; }); return a; };

// CSS declarations with the media queries around them: [{ sel, prop, value, at, wide, media }]. media is the
// @media rule around it that asks the window's width, if any.
function decls(css) {
  const out = [], stack = [];
  let buf = "", i = 0, sel = null;
  const strip = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  for (; i < strip.length; i++) {
    const c = strip[i];
    if (c === "{") {
      const pre = buf.trim();
      if (pre.startsWith("@")) stack.push(pre); else { stack.push(null); sel = pre; }
      buf = "";
    } else if (c === "}") {
      if (sel !== null && buf.trim()) push(buf, i - buf.length);
      const top = stack.pop();
      if (top === null) sel = null;
      buf = "";
    } else if (c === ";" && sel !== null) {
      push(buf, i - buf.length); buf = "";
    } else buf += c;
  }
  function push(d, at) {
    const k = d.indexOf(":");
    if (k < 0) return;
    const lead = d.length - d.trimStart().length;
    out.push({ sel, prop: d.slice(0, k).trim().toLowerCase(), value: d.slice(k + 1).trim(), at: at + lead, wide: stack.some((s) => s && /min-width/.test(s)),
      media: stack.find((s) => s && /^@media\b/i.test(s) && /width/i.test(s)) || "" });
  }
  return out;
}

// The page plus every part not yet folded in, so a helper can check the moment it has written.
const parts = isDir("draw") ? fs.readdirSync("draw").filter((d) => isDir(`draw/${d}`))
  .flatMap((d) => htmlIn(`draw/${d}`).map((f) => read(`draw/${d}/${f}`) || "")) : [];
const everything = [page, ...parts].join("\n");
const scriptsAll = split(everything).filter((b) => b.kind === "script").map((b) => b.body).join("\n");
const idsAll = new Set([...everything.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const ssAll = new Set([...everything.matchAll(/data-ss-id="([^"]+)"/g)].map((m) => m[1]));
const seen = new Map(); // data-ss-id -> first place

function checkUnit(slug, u) {
  const blocks = split(u.text);
  const phoneWidths = [];
  for (const b of blocks.filter((b) => b.kind === "style")) for (const d of decls(b.body)) {
    if (d.wide) continue;
    const v = d.value.toLowerCase();
    const px = +((/^(width|max-width|flex-basis)$/.test(d.prop) ? v : d.prop === "flex" ? (v.split(/\s+/)[2] || "") : "").match(/^(\d+(?:\.\d+)?)px\b/) || [])[1];
    if (px >= 120) phoneWidths.push({ sel: d.sel, px });
  }
  const where = (i) => `${u.file}:${u.base + lineAt(u.text, i)}`;
  // Tags: anchors, controls, placeholders, links, handlers.
  const tag = /<([a-zA-Z][\w-]*)(\s[^>]*)?>/g;
  let m;
  while ((m = tag.exec(u.text))) {
    if (inside(blocks, m.index)) continue;
    const name = m[1].toLowerCase(), a = attrs(m[2] || "");
    const id = a["data-ss-id"];
    if (id !== undefined) {
      if (CONTROLS.has(name)) fail(slug, where(m.index), `data-ss-id="${id}" is on a <${name}>: put it on the block around it`);
      // Spacesheep marks unmarked lines on save (auto-<tag>-<hash>, -2 on a clash); renaming one cuts its comments off.
      else if (id !== `direction-${slug}` && !id.startsWith(`${slug}-`) && !/^auto-[a-z0-9]+-[a-z0-9]{6}(?:-\d+)?$/.test(id)) fail(slug, where(m.index), `data-ss-id="${id}" doesn't start with "${slug}-"`);
      if (seen.has(id) && seen.get(id) !== where(m.index)) fail(slug, where(m.index), `data-ss-id="${id}" is used twice (also ${seen.get(id)})`);
      else seen.set(id, where(m.index));
    }
    if (name === "a" && a.href !== undefined) {
      if (a.href === "#" || a.href === "" || /^javascript:/i.test(a.href)) fail(slug, where(m.index), `a link goes nowhere (href="${a.href}")`);
      else if (a.href.startsWith("#") && !idsAll.has(a.href.slice(1)) && !ssAll.has(decodeURIComponent(a.href.slice(1)))) fail(slug, where(m.index), `link to ${a.href}, which nothing on the page has as its id`);
    }
    for (const k of ["for", "aria-controls"]) if (a[k] && !a[k].split(/\s+/).every((x) => idsAll.has(x))) fail(slug, where(m.index), `${k}="${a[k]}" names no id on the page`);
    if (a.placeholder) {
      // The source can't see a field's font or what shares its row, so the room is a plain limit: in
      // rounds 8 and 9 the narrowest phone field held 20 characters (a 322 px field in large type held 21).
      // A px width, basis or flex basis set on the field or the two tags around it can only lower it.
      const near = [a.class || "", ...[...u.text.slice(Math.max(0, m.index - 600), m.index).matchAll(/<[a-z][^>]*class="([^"]*)"[^>]*>/gi)].slice(-2).map((x) => x[1])].join(" ").split(/\s+/).filter(Boolean);
      const px = phoneWidths.filter((w) => near.some((c) => w.sel.includes("." + c))).map((w) => w.px);
      const room = Math.min(20, Math.floor((Math.min(358, ...px) - 40) / 8.5));
      if (a.placeholder.length > room) fail(slug, where(m.index), `placeholder "${a.placeholder}" is ${a.placeholder.length} characters; at most ${room} fit its field on a phone: shorten it, and let the label say the rest`);
    }
    const control = name === "button" || name === "select" || a.role === "tab" || (name === "input" && /^(checkbox|radio)$/i.test(a.type || ""));
    if (control && !Object.keys(a).some((k) => k.startsWith("on")) && a.type !== "submit") {
      const data = Object.keys(a).filter((k) => k.startsWith("data-") && k !== "data-ss-id");
      const camel = data.map((k) => k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()));
      const hooks = [a.id, a.name, ...(a.class || "").split(/\s+/), ...data].filter((h) => h && h.length > 1);
      const read = camel.some((c) => new RegExp(`[.'"\\[]${c}\\b`).test(scriptsAll)); // el.dataset.fooBar, or a copy of it
      if (!read && !hooks.some((h) => scriptsAll.includes(h))) {
        const label = (u.text.slice(m.index + m[0].length).match(/^([^<]{0,40})/) || [])[1].trim();
        fail(slug, where(m.index), `<${name}${label ? ` "${label}"` : ""}> has no handler: no script names its id, class or data- attribute`);
      }
    }
  }
  // CSS: widths, nowrap, scrollers, colours, tiny type.
  const colours = [];
  const styles = blocks.filter((b) => b.kind === "style").map((b) => ({ body: b.body, at: b.bodyAt }));
  for (const s of u.text.matchAll(/\sstyle="([^"]*)"/g)) styles.push({ body: `x{${s[1]}}`, at: s.index + 8 - 2 });
  const windowed = new Set();
  for (const s of styles) for (const d of decls(s.body)) {
    const w = where(s.at + d.at), v = d.value.toLowerCase();
    // On the canvas each frame has its own width and the window another: a rule on the window's width gives a
    // phone frame the wide layout (and a desktop frame the phone one, on a phone). The frame is the container.
    if (d.media && !windowed.has(d.media)) {
      windowed.add(d.media);
      const asks = d.media.match(/\((?:min|max)-width[^)]*\)/gi) || [];
      fail(slug, w, `"${d.media}" asks the window's width, not the frame's: on the canvas a phone frame gets the wide rule; write it as @container ${asks.join(" and ") || "(…)"}`);
    }
    if (d.prop.startsWith("--")) continue;
    if (/(^|[^\w.-])(\d+\.?\d*|\.\d+)vw\b/.test(v)) fail(slug, w, `${d.prop}: ${d.value} in "${d.sel}" follows the window's width, not the frame's: use cqi`);
    if (!d.wide) {
      if (/^(width|min-width|flex-basis)$/.test(d.prop)) { const px = +(v.match(/^(\d+(?:\.\d+)?)px\b/) || [])[1]; if (px > 390) fail(slug, w, `${d.prop}: ${px}px in "${d.sel}" is wider than a phone (390 px)`); }
      if (d.prop === "grid-template-columns") { const px = [...v.replace(/minmax\([^)]*\)/g, "").matchAll(/(\d+(?:\.\d+)?)px/g)].reduce((t, x) => t + +x[1], 0); if (px > 240) fail(slug, w, `grid columns "${d.value}" in "${d.sel}" fix ${px}px, leaving under ${390 - px}px on a phone: stack them below 40rem`); }
      if (d.prop === "white-space" && v.startsWith("nowrap") && !/sr-only|visually-hidden/.test(d.sel)) fail(slug, w, `white-space: nowrap in "${d.sel}": let it wrap`);
      if (/^overflow(-x)?$/.test(d.prop) && /(auto|scroll)/.test(v)) fail(slug, w, `${d.prop}: ${v} in "${d.sel}": use the starter's .k-cards or .k-table, not a scroller`);
    }
    if (d.prop === "font-size") { const px = +(v.match(/^(\d+(?:\.\d+)?)px\b/) || [])[1] || (+(v.match(/^(\d*\.?\d+)rem\b/) || [])[1] * 16); if (px && px < 12) fail(slug, w, `font-size ${d.value} in "${d.sel}" is under 12 px`); }
    for (const c of v.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g)) if (!NEUTRAL.test(c[0])) colours.push({ c: c[0], w });
  }
  // Display type set tighter than its own height, with too little room around it: a face the stack names but
  // the picture's renderer lacks (Rockwell on a Mac) can be taller and run into the text beside it.
  for (const s of styles) {
    const rules = new Map();
    for (const d of decls(s.body)) {
      const k = `${d.sel}\u0000${d.media}`;
      if (!rules.has(k)) rules.set(k, { sel: d.sel, ds: [] });
      rules.get(k).ds.push(d);
    }
    for (const r of rules.values()) {
      if (/::?(first-letter|first-line|before|after|marker)\b/i.test(r.sel) || /^(left|right|inline-start|inline-end)\b/i.test((r.ds.filter((d) => d.prop === "float").pop() || {}).value || "")) continue; // a drop cap floats beside its text
      const said = tight(r.ds);
      if (said) fail(slug, where(s.at + said.at), `display type in "${r.sel}" ${said.text}: a taller face the stack names, one the picture's renderer lacks, can run into the text beside it; give it a margin of a fifth of its size above and below; keep the line-height`);
    }
  }
  if (colours.length) fail(slug, colours[0].w, `colour ${colours[0].c} isn't a token${colours.length > 1 ? ` (${colours.length - 1} more: ${[...new Set(colours.slice(1).map((x) => x.c))].slice(0, 4).join(", ")})` : ""}: use the direction's variables`);
  // Scripts: each one must parse, and run a second time in the same tab, as it does after a live push.
  for (const b of blocks.filter((b) => b.kind === "script")) {
    try { new vm.Script(b.body); } catch (e) { fail(slug, where(b.bodyAt), `the script doesn't parse: ${e.message}`); continue; }
    const name = declaredTwice(b.body);
    if (name) fail(slug, where(b.bodyAt), `the script declares ${name} at its top (const, let or class): a live push runs the page's scripts again in the same tab, where that stops the whole script; put its code inside (() => { … })();`);
  }
}

// For one rule's declarations, in their order: { text, at } when it sets display type (40 px or more, at a 1280 px
// frame) under line-height 1 with less than a fifth of its size clear above or below it (margin and padding
// together, each side as the last declaration that sets it leaves it), else null.
function tight(ds) {
  let size = "", lh = "", at = 0;
  const box = { margin: ["0", "0"], padding: ["0", "0"] };
  for (const d of ds) {
    const v = d.value.replace(/\s*!important$/i, ""), side = d.prop.match(/^(margin|padding)(?:-(top|bottom|block|block-start|block-end))?$/);
    if (d.prop === "font") { const f = v.match(/(\S+)\s*\/\s*(\S+)/); size = f ? f[1] : (v.match(/\d*\.?\d+(?:px|rem|em|cqi|cqw|vw|vh|vmin|vmax)\b/i) || [""])[0]; lh = f ? f[2] : ""; at = d.at; }
    else if (d.prop === "font-size") size = v;
    else if (d.prop === "line-height") { lh = v; at = d.at; }
    else if (side) {
      const w = v.split(/\s+/), b = box[side[1]];
      if (!side[2]) box[side[1]] = [w[0], w[2] ?? w[0]];
      else if (side[2] === "block") box[side[1]] = [w[0], w[1] ?? w[0]];
      else b[/top|start/.test(side[2]) ? 0 : 1] = v;
    }
  }
  const PX = { px: 1, rem: 16, em: 16, cqi: 12.8, cqw: 12.8, vw: 14.4, vh: 9, vmin: 9, vmax: 14.4 };
  const px = Math.max(0, ...[...size.toLowerCase().matchAll(/(\d*\.?\d+)(px|rem|em|cqi|cqw|vw|vh|vmin|vmax)\b/g)].map((m) => m[1] * PX[m[2]]));
  if (px < 40 || !lh) return null;
  const n = lh.trim().toLowerCase().match(/^(\d*\.?\d+)(%|em|px)?$/);
  if (!n) return null;
  const ratio = n[2] === "%" ? n[1] / 100 : n[2] === "px" ? n[1] / px : +n[1];
  if (ratio >= 1) return null;
  const len = (v) => { const m = (v || "").trim().toLowerCase().match(/^(-?\d*\.?\d+)(em|px|rem)?$/); return !m ? 0 : m[2] === "em" ? m[1] * px : m[2] === "rem" ? m[1] * 16 : +m[1]; };
  const clear = (i) => len(box.margin[i]) + len(box.padding[i]), need = px / 5 - 0.01;
  const short = [clear(0) < need && "above", clear(1) < need && "below"].filter(Boolean);
  if (!short.length) return null;
  return { at, text: `sets line-height ${lh.trim()} with less than a fifth of its size clear ${short.join(" and ")}` };
}

// The name a script declares at its top with const, let or class, which a second run in the same window
// declares again and so stops the whole script there ("" for none). The script runs twice in one empty
// context, each time behind a first line that throws: its names are declared, and none of its code runs.
function declaredTwice(src) {
  const tab = vm.createContext({});
  for (let n = 0; n < 2; n++) {
    try { vm.runInContext(`throw 0;\n${src}`, tab); }
    catch (e) {
      if (e === 0) continue;
      const m = /Identifier '([^']+)' has already been declared/.exec(String(e && e.message));
      return m ? `"${m[1]}"` : "";
    }
  }
  return "";
}

// The brief's facts: `fact: …` shows in every direction, `not: …` in none.
const norm = (s) => s.replace(/&nbsp;| /g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;|[“”]/g, '"').replace(/&#39;|&rsquo;|[‘’]/g, "'").replace(/[–—]/g, "-").replace(/\s+/g, " ").toLowerCase();
const brief = read("draw/BRIEF.md") || "";
const facts = [...brief.matchAll(/^\s*[-*]?\s*fact:\s*(.+?)\s*$/gim)].map((m) => m[1]);
const nots = [...brief.matchAll(/^\s*[-*]?\s*not:\s*(.+?)\s*$/gim)].map((m) => m[1]);
// The request (`ask: …` lines): six of its words in a row on the page are the brief quoted, not designed.
// Words a `fact:` covers break a run, so facts given in the request's own order still pass.
const words = (s) => norm(s).match(/[\p{L}\p{N}]+(?:['.,][\p{L}\p{N}]+)*/gu) || [];
// The same goes for each direction's line (data-line): it says what the direction is for, to the person
// choosing, so six of its words in a row inside any direction are the design described to the product's user.
const quotes = [];
const said = (text, why) => {
  const ws = words(text), cut = ws.map(() => false);
  for (const f of facts.map(words).filter((w) => w.length))
    for (let i = 0; i + f.length <= ws.length; i++) if (f.every((w, j) => ws[i + j] === w)) f.forEach((_, j) => (cut[i + j] = true));
  for (let i = 0; i + 6 <= ws.length; i++) if (!cut.slice(i, i + 6).includes(true)) quotes.push({ q: ws.slice(i, i + 6), why });
};
for (const m of brief.matchAll(/^\s*[-*]?\s*ask:\s*(.+?)\s*$/gim)) said(m[1], "the request: the design shows a requirement, the page never states it");
for (const m of page.matchAll(/<section\b[^>]*data-ss-id="direction-[a-z0-9-]+"[^>]*>/g)) {
  const a = attrs(m[0].slice(8, -1));
  if (a["data-line"]) said(a["data-line"], `${a["data-ss-label"] || "a direction"}'s line: the page speaks to the person using the product, never about its design`);
}
const shownText = (t) => t.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*?\b(alt|title|aria-label|placeholder|value)="([^"]*)"[^>]*>/gi, " $2 ").replace(/<[^>]+>/g, " ");

const dirs = directions(page).filter((d) => !only || d.slug === only);
if (only && !dirs.length) { console.error(`check: no direction "${only}" on the page`); process.exit(2); }

// Colour pairs: each direction's tokens, read from the page and its parts (later rules win), with the
// starter's defaults for the ones it doesn't set, and every pair the kit puts text on must read: 4.5:1.
// A colour is [r, g, b, alpha], alpha from 0 to 1; null when this check can't read it.
const NAMED = { white: "#ffffff", black: "#000000", transparent: "#0000" };
function rgb(v, tok, depth = 0) {
  v = (v || "").trim().toLowerCase();
  if (depth > 8) return null;
  const ref = v.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/);
  if (ref) return tok[ref[1]] ? rgb(tok[ref[1]], tok, depth + 1) : ref[2] ? rgb(ref[2], tok, depth + 1) : null;
  if (NAMED[v]) v = NAMED[v];
  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 5 || h.length === 7) return null;
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1);
  }
  m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)(%?)\s*)?\)$/);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : Math.min(1, m[5] ? m[4] / 100 : +m[4])];
  m = v.match(/^color-mix\(\s*in\s+srgb\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+?)(?:\s+[\d.]+%)?\s*\)$/);
  if (m) {
    // CSS mixes with alpha premultiplied: a see-through colour pulls the mix toward the other one.
    const a = rgb(m[1], tok, depth + 1), b = rgb(m[3], tok, depth + 1), k = +m[2] / 100;
    if (!a || !b) return null;
    const al = a[3] * k + b[3] * (1 - k);
    return al ? [0, 1, 2].map((i) => (a[i] * a[3] * k + b[i] * b[3] * (1 - k)) / al).concat(al) : [0, 0, 0, 0];
  }
  return null;
}
// `top` drawn over `under`: what the eye gets where a see-through colour lies on another.
const over = (top, under) => {
  const al = top[3] + under[3] * (1 - top[3]);
  return al ? [0, 1, 2].map((i) => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / al).concat(al) : [0, 0, 0, 0];
};
const lum = (c) => { const [r, g, b] = c.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = (c) => "#" + c.slice(0, 3).concat(c[3] < 1 ? [c[3] * 255] : []).map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
// The ratio as drawn: the ground on the page (white or black beneath, the worse, if it lets either through),
// a card or button on the ground, the text on that.
function drawnRatio(x, y, g, onGround) {
  return Math.min(...[[255, 255, 255, 1], [0, 0, 0, 1]].map((page) => {
    const ground = over(g, page), back = onGround ? ground : over(y, ground);
    return ratio(over(x, back), back);
  }));
}
const PAIRS = [["--brand-ink", "--brand-ground", "text on its ground"], ["--brand-muted", "--brand-ground", "muted text on the ground"],
  ["--brand-on-surface", "--brand-surface", "text on a card or field"], ["--brand-muted", "--brand-surface", "muted text on a card"],
  ["--brand-on-accent", "--brand-accent", "a button's label on the accent"], ["--brand-accent", "--brand-ground", "accent text and links on the ground"]];
// A rule counts for a direction when one of its selectors ends with [data-ss-id="direction-<slug>"], and for a
// device view also with [data-view-of="<its direction>"], which the direction's own rule lists beside its id.
function tokens(d, texts) {
  const tok = { "--brand-surface": "color-mix(in srgb, var(--brand-ink) 6%, var(--brand-ground))", "--brand-on-surface": "var(--brand-ink)",
    "--brand-muted": "color-mix(in srgb, var(--brand-ink) 74%, var(--brand-ground))", "--brand-on-accent": "var(--brand-ground)" };
  const mine = [`[data-ss-id="direction-${d.slug}"]`, ...(d.of ? [`[data-view-of="${d.of}"]`] : [])];
  for (const t of texts) for (const b of split(t)) {
    if (b.kind !== "style") continue;
    for (const m of b.body.replace(/\/\*[\s\S]*?\*\//g, " ").matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      if (!m[1].split(",").some((sel) => mine.some((x) => sel.trim().endsWith(x)))) continue;
      for (const x of m[2].matchAll(/(--brand-[\w-]+)\s*:\s*([^;]+)/g)) tok[x[1]] = x[2].trim();
    }
  }
  return tok;
}
const every = directions(page);
// The canvas numbers frames in page order, and its number keys open them: views come after the last direction,
// so the directions keep 1 to n and match the switcher's tabs.
for (const v of dirs.filter((d) => d.of)) {
  if (!every.some((d) => !d.of && d.slug === v.of)) { fail(v.slug, "work/index.html", `data-view-of="${v.of}" names no direction on the page: give the slug of the direction this view shows`); continue; }
  const before = every.filter((d) => !d.of && d.start > v.start).length;
  if (before) fail(v.slug, "work/index.html", `the view comes before ${before} direction${before === 1 ? "" : "s"}: move its section after the last direction's, so the canvas numbers the directions 1 to ${every.filter((d) => !d.of).length} and their number keys match the tabs (data-ss-x and data-ss-y still draw it under its own)`);
  const sources_ = [page, ...sources(v).map((u) => u.text)];
  if (tokens({ slug: v.of }, sources_)["--brand-ground"] && !tokens(v, sources_)["--brand-ground"])
    fail(v.slug, "tokens", `the view gets none of ${v.of}'s tokens: list [data-view-of="${v.of}"] beside [data-ss-id="direction-${v.of}"] in its rule's selector`);
}
for (const d of dirs) {
  const units = sources(d);
  for (const u of units) checkUnit(d.slug, u);
  const all = units.map((u) => u.text).join("\n");
  const shown = norm(shownText(all));
  for (const f of facts) if (!shown.includes(norm(f))) fail(d.slug, units[units.length - 1].file, `missing fact: "${f}"`);
  const tok = tokens(d, [page, ...units.map((u) => u.text)]);
  for (const [fg, bg, what] of PAIRS) {
    const x = rgb(tok[fg], tok), y = rgb(tok[bg], tok), g = rgb(tok["--brand-ground"], tok);
    if (!x || !y || !g) continue; // a colour this check can't read (oklch, a gradient): the look checks it
    const r = drawnRatio(x, y, g, bg === "--brand-ground");
    if (r < 4.5) fail(d.slug, "tokens", `contrast ${r.toFixed(1)}:1 for ${what} (${fg} ${hex(x)} on ${bg} ${hex(y)}): 4.5 needed; change the token in the direction's rule`);
  }
  for (const f of nots) if (shown.includes(norm(f))) fail(d.slug, (units.find((u) => norm(u.text.replace(/<[^>]+>/g, " ")).includes(norm(f))) || units[0]).file, `shows "${f}", which the brief says no direction may`);
  const told = new Set();
  for (const u of units) {
    const text = ` ${words(shownText(u.text)).join(" ")} `;
    for (const { q, why } of quotes) {
      if (told.has(why) || !text.includes(` ${q.join(" ")} `)) continue;
      told.add(why);
      const at = u.text.replace(/^<section\b[^>]*>/, (t) => " ".repeat(t.length)).search(new RegExp(q.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(?:[^\\p{L}\\p{N}]|<[^>]*>|&[a-z#0-9]+;)+"), "iu"));
      fail(d.slug, at < 0 ? u.file : `${u.file}:${u.base + lineAt(u.text, at)}`, `quotes ${why.replace(":", ` ("${q.join(" ")}"):`)}`);
    }
  }
}
if (!only && page.length > 200000) fail("page", "work/index.html", `the page is ${Math.round(page.length / 1000)} KB: over 200 KB is slow on a phone`);

// The Decisions log is the record, read from the source and never shown. The canvas draws any block outside a
// direction as a frame of its own, at the top left of the first frame when it has no place, so the log is
// pinned off the canvas (data-ss-canvas="pin") and kept out of sight (style="display:none"). The tag is read as
// the browser reads it: spaces around "=", any quotes, a ">" inside a quoted value, and the display that wins
// (an !important one, else the last).
const shownDisplay = (style) => {
  let won = "", important = false;
  for (const d of style.replace(/\/\*[\s\S]*?\*\//g, " ").split(";")) {
    const k = d.indexOf(":");
    if (k < 0 || d.slice(0, k).trim().toLowerCase() !== "display") continue;
    const v = d.slice(k + 1).trim().toLowerCase(), imp = /!\s*important$/.test(v);
    if (imp || !important) { won = v.replace(/\s*!\s*important$/, ""); important = imp; }
  }
  return won;
};
if (!only) {
  const bare = page.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, " "));
  for (const m of bare.matchAll(/<[a-z][a-z0-9-]*((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
    const a = attrs(m[1]);
    if ((a["data-ss-id"] || "").trim().toLowerCase() !== "decisions") continue;
    if (a["data-ss-canvas"] !== "pin" || shownDisplay(a.style || "") !== "none")
      fail("page", `work/index.html:${lineAt(page, m.index)}`, 'the Decisions log would show in the design: open it as <details class="no-print" data-ss-id="decisions" data-ss-canvas="pin" style="display:none">');
  }
}

// Controls: the inputs in the page's .tweaks pane, which Spacesheep draws as Tweaks. At most 6, each named by its
// label's first words, each a token the page sets and uses. A switch or choice needs a rule for every value past
// 0, or that value changes nothing.
if (!only) {
  const pane = (page.match(/<details\b[^>]*\bclass="[^"]*\btweaks\b[^"]*"[^>]*>[\s\S]*?<\/details>/) || [""])[0];
  const css = [page, ...dirs.flatMap((d) => sources(d).map((u) => u.text))].join("\n").replace(/<!--[\s\S]*?-->/g, "");
  const at = (tag, a) => (tag.match(new RegExp(`\\b${a}="([^"]*)"`)) || [])[1];
  const inputs = [...pane.matchAll(/(<label\b[^>]*>)?\s*([^<]*?)\s*<input\b([^>]*)>/g)].filter((m) => /\bdata-var=/.test(m[3]));
  const said = (m, msg) => fail("controls", "work/index.html", `${at(m[3], "data-var") || "a control"}: ${msg}`);
  if (inputs.length > 6) fail("controls", "work/index.html", `${inputs.length} controls: 6 at most`);
  const vars = new Set();
  for (const m of inputs) {
    const v = at(m[3], "data-var"), type = at(m[3], "type"), kind = at(m[3], "data-kind"), n = (a) => Number(at(m[3], a));
    if (!/^--[a-z0-9-]{1,40}$/.test(v || "") || vars.has(v)) { said(m, "data-var must be a token name of its own, like --hero"); continue; }
    vars.add(v);
    if (!m[1] || !m[2]) said(m, "write it as <label>Its name <input …></label>: Tweaks shows that name");
    let values = 0; // a well-formed switch or choice: its values past 0, each to be styled (3 at most)
    if (type === "color") { /* a colour has no more to it */ }
    else if (type !== "range") said(m, `type="${type}": a control is type="color" or type="range"`);
    else if (kind === "switch") { if (n("min") !== 0 || n("max") !== 1 || n("step") !== 1) said(m, 'a switch is min="0" max="1" step="1"'); else values = 1; }
    else if (kind === "choice") {
      const o = (at(m[3], "data-options") || "").split("|");
      if (o.length < 2 || o.length > 4 || o.some((x) => !x.trim() || x.length > 14)) said(m, 'a choice has 2 to 4 options of at most 14 characters, in data-options="A|B|C"');
      else if (n("min") !== 0 || n("max") !== o.length - 1 || n("step") !== 1) said(m, `a choice of ${o.length} is min="0" max="${o.length - 1}" step="1"`);
      else values = o.length - 1;
    } else if (kind) said(m, `data-kind="${kind}": a control's kind is switch or choice`);
    else if (!(n("max") > n("min")) || !(n("step") > 0) || !["", "px", "rem", "em", "%"].includes(at(m[3], "data-unit") || "")) said(m, "a slider needs min below max, a step above 0, and data-unit px, rem, em, % or none");
    const esc = v.replace(/-/g, "\\-");
    if (!new RegExp(`${esc}\\s*:`).test(css)) said(m, "nothing sets it: give each direction its own value on its section");
    if (kind === "switch" || kind === "choice") {
      // Every value but the one a direction opens on needs a rule; which one that is may differ by direction.
      const bare = [];
      for (let k = 0; k <= values; k++) if (!new RegExp(`\\[data-${v.slice(2)}=["']?${k}["']?\\]`).test(css)) bare.push(k);
      if (values && bare.length > 1) said(m, `nothing is styled for ${bare.map((k) => `[data-${v.slice(2)}="${k}"]`).join(" or ")}: style every value but the one each direction opens on, or those values change nothing`);
    } else if (!new RegExp(`var\\(\\s*${esc}\\s*[,)]`).test(css)) said(m, "nothing uses it, so it changes nothing");
  }
}

if (!fails.length) {
  const n = dirs.filter((d) => !d.of).length, v = dirs.length - n;
  console.log(`all pass: ${n} direction${n === 1 ? "" : "s"}${v ? `, ${v} view${v === 1 ? "" : "s"}` : ""}, ${facts.length} facts, ${nots.length} not-lines, ${seen.size} anchors`);
  process.exit(0);
}
const groups = new Map();
for (const f of fails) { const k = f.dir + "\u0000" + f.msg.replace(/also [^)]*/, ""); if (groups.has(k)) groups.get(k).n++; else groups.set(k, { ...f, n: 1 }); }
const lines = [...groups.values()];
for (const f of lines.slice(0, 40)) console.log(`${f.dir}  ${f.where}  ${f.msg}${f.n > 1 ? ` (${f.n} times, first shown)` : ""}`);
if (lines.length > 40) console.log(`… and ${lines.length - 40} more`);
const by = {};
for (const f of fails) by[f.dir] = (by[f.dir] || 0) + 1;
console.log(`${fails.length} to fix (${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(", ")})`);
process.exit(1);
