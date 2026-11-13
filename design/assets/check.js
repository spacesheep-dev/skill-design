#!/usr/bin/env node
// Every check the source can decide, so neither the lead nor a helper writes a check script.
// Run it from the folder holding work/ and draw/:
//
//   node check.js              every direction, then the page as a whole
//   node check.js <slug>       one direction (a helper's closing check)
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

const only = process.argv[2];
const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } };
const page = read("work/index.html");
if (page === null) { console.error("check: no work/index.html here (run it from the folder holding work/ and draw/)"); process.exit(2); }

const CONTROLS = new Set(["a", "button", "input", "label", "select", "textarea", "summary", "option"]);
const NEUTRAL = /^(#fff|#ffffff|#000|#000000|white|black|transparent|currentcolor|inherit|initial|unset|none|rgba?\(\s*(0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)\b[^)]*\))$/i;
const lineAt = (text, i) => text.slice(0, i).split("\n").length;
const fails = [];
const fail = (dir, where, msg) => fails.push({ dir, where, msg });

// The page's directions: each <section class="direction" data-ss-id="direction-<slug>">, nesting counted.
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
    out.push({ slug: id, start: m.index, end });
    open.lastIndex = end;
  }
  return out;
}

// A direction's sources: its part files, else its one file, else its slice of the page.
function sources(d) {
  const dir = `draw/${d.slug}`;
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html")).sort();
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

// CSS declarations with the media queries around them: [{ sel, prop, value, at, wide }].
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
    out.push({ sel, prop: d.slice(0, k).trim().toLowerCase(), value: d.slice(k + 1).trim(), at: at + lead, wide: stack.some((s) => s && /min-width/.test(s)) });
  }
  return out;
}

// The page plus every part not yet folded in, so a helper can check the moment it has written.
const parts = fs.existsSync("draw") ? fs.readdirSync("draw").filter((d) => fs.statSync(`draw/${d}`).isDirectory())
  .flatMap((d) => fs.readdirSync(`draw/${d}`).filter((f) => f.endsWith(".html")).map((f) => read(`draw/${d}/${f}`) || "")) : [];
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
      else if (id !== `direction-${slug}` && !id.startsWith(`${slug}-`)) fail(slug, where(m.index), `data-ss-id="${id}" doesn't start with "${slug}-"`);
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
  for (const s of styles) for (const d of decls(s.body)) {
    const w = where(s.at + d.at), v = d.value.toLowerCase();
    if (d.prop.startsWith("--")) continue;
    if (!d.wide) {
      if (/^(width|min-width|flex-basis)$/.test(d.prop)) { const px = +(v.match(/^(\d+(?:\.\d+)?)px\b/) || [])[1]; if (px > 390) fail(slug, w, `${d.prop}: ${px}px in "${d.sel}" is wider than a phone (390 px)`); }
      if (d.prop === "grid-template-columns") { const px = [...v.replace(/minmax\([^)]*\)/g, "").matchAll(/(\d+(?:\.\d+)?)px/g)].reduce((t, x) => t + +x[1], 0); if (px > 240) fail(slug, w, `grid columns "${d.value}" in "${d.sel}" fix ${px}px, leaving under ${390 - px}px on a phone: stack them below 40rem`); }
      if (d.prop === "white-space" && v.startsWith("nowrap") && !/sr-only|visually-hidden/.test(d.sel)) fail(slug, w, `white-space: nowrap in "${d.sel}": let it wrap`);
      if (/^overflow(-x)?$/.test(d.prop) && /(auto|scroll)/.test(v)) fail(slug, w, `${d.prop}: ${v} in "${d.sel}": use the starter's .cards or .stack, not a scroller`);
    }
    if (d.prop === "font-size") { const px = +(v.match(/^(\d+(?:\.\d+)?)px\b/) || [])[1] || (+(v.match(/^(\d*\.?\d+)rem\b/) || [])[1] * 16); if (px && px < 12) fail(slug, w, `font-size ${d.value} in "${d.sel}" is under 12 px`); }
    for (const c of v.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g)) if (!NEUTRAL.test(c[0])) colours.push({ c: c[0], w });
  }
  if (colours.length) fail(slug, colours[0].w, `colour ${colours[0].c} isn't a token${colours.length > 1 ? ` (${colours.length - 1} more: ${[...new Set(colours.slice(1).map((x) => x.c))].slice(0, 4).join(", ")})` : ""}: use the direction's variables`);
  // Scripts: each one must at least parse.
  for (const b of blocks.filter((b) => b.kind === "script")) {
    try { new vm.Script(b.body); } catch (e) { fail(slug, where(b.bodyAt), `the script doesn't parse: ${e.message}`); }
  }
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
for (const d of dirs) {
  const units = sources(d);
  for (const u of units) checkUnit(d.slug, u);
  const all = units.map((u) => u.text).join("\n");
  const shown = norm(shownText(all));
  for (const f of facts) if (!shown.includes(norm(f))) fail(d.slug, units[units.length - 1].file, `missing fact: "${f}"`);
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

if (!fails.length) {
  console.log(`all pass: ${dirs.length} direction${dirs.length === 1 ? "" : "s"}, ${facts.length} facts, ${nots.length} not-lines, ${seen.size} anchors`);
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
