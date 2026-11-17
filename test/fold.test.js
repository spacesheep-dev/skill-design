// fold.js against a stand-in spacesheep CLI: no network, no space. Run with `node --test test/fold.test.js`.
// The stand-in logs every call (one JSON array of its arguments a line) and answers as the CLI does.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const FOLD = path.join(__dirname, "..", "design", "assets", "fold.js");
const BASE = fs.readFileSync(path.join(__dirname, "..", "design", "assets", "base.html"), "utf8");
const SPACE = "11111111-2222-4333-8444-555555555555";
// The starter as start lays it: with the space's own title, never a new one.
const starterAs = (title) => BASE.replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`);

const CLI = `#!/usr/bin/env node
const fs = require("fs"), path = require("path");
const a = process.argv.slice(2), dir = process.env.FAKE_DIR;
fs.appendFileSync(path.join(dir, "calls.log"), JSON.stringify(a) + "\\n");
if (a[0] === "call") { fs.appendFileSync(path.join(dir, "stdin.log"), JSON.stringify(JSON.parse(fs.readFileSync(0, "utf8"))) + "\\n"); process.exit(0); }
if (a[0] === "deploy" && a.includes("--json")) {
  fs.writeFileSync(path.join(dir, "first.html"), fs.readFileSync("work/index.html"));
  console.log(JSON.stringify({ space: { id: "${SPACE}", url: "https://stage.test/s" } }));
  process.exit(0);
}
if (a[0] === "deploy" && process.env.FAKE_REFUSE) {
  const n = fs.statSync("work/index.html").size;
  console.error("= index.html unchanged");
  console.error("↑ index.html (" + n + " bytes)");
  console.error("✗ index.html would shrink from 38318 to " + n + " bytes (90% smaller), which looks like a page lost rather than a page edited. Nothing was published; the space keeps its current version. To publish this smaller page on purpose, send the same call again with drop_files: true.");
  process.exit(1);
}
// The space's history, newest first: one version with the message the tests save with, made 10 s ago.
// A deploy the server answers late: with "landed" its version goes on top first; either way it never ends by itself.
const VERSIONS = path.join(dir, "versions.json");
const history = () => fs.existsSync(VERSIONS) ? JSON.parse(fs.readFileSync(VERSIONS, "utf8")) : [{ id: "a8a114a8aa44", label: "Big Day, red 18", created_at: new Date(Date.now() - 10000).toISOString() }];
if (a[0] === "deploy" && process.env.FAKE_HANG) {
  if (process.env.FAKE_HANG === "landed") fs.writeFileSync(VERSIONS, JSON.stringify([{ id: "d4c0834a3907", label: a[a.indexOf("-m") + 1], created_at: new Date().toISOString() }, ...history()]));
  setTimeout(() => process.exit(0), 30000);
  return;
}
// The history refused: always, only before the deploy has made a version ("before"), or only after ("after").
if (a[0] === "versions") {
  const h = process.env.FAKE_HISTORY, made = fs.existsSync(VERSIONS);
  if (h === "refused" || (h === "before" && !made) || (h === "after" && made)) { console.error("forbidden: This account may not do this here."); process.exit(1); }
  const n = Number(a[a.indexOf("--limit") + 1]) || 50, all = history();
  console.log(JSON.stringify({ versions: all.slice(0, n), page: { next: all.length > n ? all[n - 1].id : "" } }));
  process.exit(0);
}
// What each save sent; FAKE_TOUCH changes work/ during the upload, as a writer's fold can.
if (a[0] === "deploy") {
  fs.copyFileSync("work/index.html", path.join(dir, "deployed.html"));
  if (process.env.FAKE_TOUCH) fs.appendFileSync("work/index.html", "\\n<!-- folded during the save -->");
  console.log("✓ Updated https://stage.test/s");
  process.exit(0);
}
// A picture: a whole 2 x 2 RGB PNG, as the renderer sends one.
if (a[0] === "spaces" && a[1] === "screenshot" && process.env.FAKE_SHOT) {
  const zlib = require("zlib");
  const chunk = (k, d) => { const l = Buffer.alloc(4), c = Buffer.alloc(4), kd = Buffer.concat([Buffer.from(k, "latin1"), d]); l.writeUInt32BE(d.length); c.writeUInt32BE(zlib.crc32(kd) >>> 0); return Buffer.concat([l, kd, c]); };
  const head = Buffer.alloc(13); head.writeUInt32BE(2, 0); head.writeUInt32BE(2, 4); head[8] = 8; head[9] = 2;
  const raw = Buffer.alloc(14, 255); raw[0] = 0; raw[7] = 0;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
  console.log(JSON.stringify({ png: png.toString("base64"), resource_failures: [] }));
  process.exit(0);
}
// FAKE_SLOW_GET: the space's details take 1.5 s, and the times log says when each call started and ended.
if (process.env.FAKE_SLOW_GET) fs.appendFileSync(path.join(dir, "times.log"), JSON.stringify([a[0], "start", Date.now()]) + "\\n");
if (a[0] === "spaces" && a[1] === "get" && process.env.FAKE_GET_REFUSED) { console.error("not_found: Nothing by that name or id here."); process.exit(1); }
if (a[0] === "read" && process.env.FAKE_SLOW_READ) { setTimeout(() => { fs.mkdirSync("work", { recursive: true }); fs.writeFileSync("work/index.html", fs.readFileSync(process.env.FAKE_PAGE)); process.exit(0); }, 1000); return; }
if (a[0] === "spaces" && a[1] === "get") {
  const done = () => { if (process.env.FAKE_SLOW_GET) fs.appendFileSync(path.join(dir, "times.log"), JSON.stringify([a[0], "end", Date.now()]) + "\\n"); console.log("title: Untitled\\n  id: ${SPACE}"); process.exit(0); };
  if (process.env.FAKE_SLOW_GET) setTimeout(done, 1500); else done();
  return;
}
if (a[0] === "read") { fs.mkdirSync("work", { recursive: true }); fs.writeFileSync("work/index.html", fs.readFileSync(process.env.FAKE_PAGE)); console.log("↓ index.html"); process.exit(0); }
process.exit(0);
`;

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fold-test-"));
  const bin = path.join(root, "bin"), folder = path.join(root, "folder");
  fs.mkdirSync(bin);
  fs.mkdirSync(folder);
  fs.writeFileSync(path.join(bin, "spacesheep"), CLI, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_DIR: root };
  const fold = (args, more = {}) => spawnSync(process.execPath, [FOLD, "-C", folder, ...args], { env: { ...env, ...more }, encoding: "utf8", timeout: 120000 });
  const calls = () => fs.readFileSync(path.join(root, "calls.log"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  // What each push_live call carried: the page, or an empty status (the work card down).
  const sent = () => { try { return fs.readFileSync(path.join(root, "stdin.log"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
  return { root, folder, fold, calls, sent };
}

test("a new space's first version is a page under 2 KB, and the starter waits in work/", () => {
  const { root, folder, fold } = setup();
  const r = fold(["start", "--new", "Lift <out of service>"]);
  assert.equal(r.status, 0, r.stderr);
  const first = fs.readFileSync(path.join(root, "first.html"), "utf8");
  assert.ok(Buffer.byteLength(first) < 2048, `first version is ${Buffer.byteLength(first)} bytes`);
  assert.match(first, /<title>Lift &lt;out of service&gt;<\/title>/);
  assert.match(first, /<meta name="ss-chat"/);
  // Not a design, so `start <link>` on it later puts the starter in work/.
  assert.doesNotMatch(first, /data-ss-id|class="direction/);
  assert.equal(fs.readFileSync(path.join(folder, "work", "index.html"), "utf8"), starterAs("Lift &lt;out of service&gt;"));
  assert.equal(fs.readFileSync(path.join(folder, "draw", "space"), "utf8").trim(), SPACE);
});

test("a refused save ends 'save refused' with the reason and the instruction to stop, not the refusal's advice", () => {
  const { folder, fold } = setup();
  assert.equal(fold(["start", "--new", "Notice"]).status, 0);
  fs.writeFileSync(path.join(folder, "work", "index.html"), "<!DOCTYPE html><title>Notice</title><p>The lift is out of service.</p>");
  assert.equal(fold(["save", "Notice", "Saving the notice"], { FAKE_REFUSE: "1" }).status, 0);
  const w = fold(["wait"]);
  assert.equal(w.status, 1, "wait must fail on a refused save");
  const last = w.stdout.trim().split("\n").pop();
  assert.match(last, /^\d\d:\d\d:\d\d save refused: index\.html would shrink from 38318 to \d+ bytes/);
  assert.match(last, /Nothing was published; the space keeps its current version\./);
  assert.match(last, /Publish no other way \(no create_version, deploy or upload\).*Tell the person in one line why, and stop$/);
  assert.doesNotMatch(last, /drop_files|unchanged|↑/);
});

test("the writer sends a part's status before the page", () => {
  const { folder, fold, calls } = setup();
  assert.equal(fold(["start", "--new", "Notice"]).status, 0);
  fs.writeFileSync(path.join(folder, "work", "index.html"),
    '<!DOCTYPE html><title>Notice</title><section class="direction" data-ss-id="direction-lift"><!-- part:lift --><p>Drawing</p><!-- /part:lift --></section>');
  fs.mkdirSync(path.join(folder, "draw", "lift"));
  fs.writeFileSync(path.join(folder, "draw", "lift", "01.html"), '<!-- status: Lift: the dates -->\n<p data-ss-id="lift-dates">The lift is out of service from 18 to 20 November.</p>\n');
  spawnSync("sleep", ["0.5"]); // older than the 300 ms a part waits, so the first pass folds it
  const started = calls().length; // start's own calls, its empty canvas among them, come before the writer's
  assert.equal(fold(["write"]).status, 0);
  const s = fold(["stop"]);
  assert.equal(s.status, 0, s.stdout + s.stderr);
  const log = calls();
  const status = log.findIndex((a) => a[0] === "live" && a.includes("Lift: the dates"));
  const page = log.findIndex((a, i) => i >= started && a[0] === "call" && a[1] === "push_live");
  assert.ok(status >= 0, "the part's status was pushed");
  assert.ok(page >= 0, "the page was pushed");
  assert.ok(status < page, `status was call ${status}, page call ${page}`);
});

test("stop alone after a save takes the work card down with an empty status, and stop again sends nothing", () => {
  const { fold, calls, sent } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  assert.equal(fold(["save", "Three poster looks", "Checking details"]).status, 0);
  const w = fold(["wait"]);
  assert.equal(w.status, 0, w.stdout + w.stderr);
  const s = fold(["stop"]);
  assert.equal(s.status, 0, s.stdout + s.stderr);
  assert.match(s.stdout, /took the work card down/);
  const log = calls();
  const status = log.findIndex((a) => a[0] === "live" && a.includes("Checking details"));
  assert.ok(status > log.findIndex((a) => a[0] === "deploy" && a.includes("Three poster looks")), "the save's status came after its deploy");
  assert.deepEqual(sent().at(-1), { space: SPACE, status: "" });
  assert.deepEqual(log.at(-1), ["call", "push_live", "-"], "the empty status is the last call");
  const n = calls().length;
  assert.equal(fold(["stop"]).status, 0);
  assert.equal(calls().length, n, "a second stop sends nothing");
});

test("stop with a message saves, and that save takes the work card down: no empty status", () => {
  const { fold, calls, sent } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  assert.equal(fold(["save", "Frame", "Drawing three directions"]).status, 0);
  assert.equal(fold(["wait"]).status, 0);
  const s = fold(["stop", "Three poster looks"]);
  assert.equal(s.status, 0, s.stdout + s.stderr);
  const log = calls();
  assert.ok(log.at(-1)[0] === "deploy" && log.at(-1).includes("Three poster looks"), `last call: ${JSON.stringify(log.at(-1))}`);
  assert.ok(!sent().some((b) => b.status === ""), "no empty status");
});

test("start says the next step, and push names the starter's placeholders after their sections without touching the rest", () => {
  const { folder, fold, sent } = setup();
  const r = fold(["start", "--new", "Poster"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^next: .*leave every <!-- part:… --> placeholder as it is.*fold\.js save "Frame" "Drawing three directions", fold\.js write.*draw\/<slug>\/01\.html/m);
  const page = path.join(folder, "work", "index.html");
  // Step 2's Edits: the opening tags only. The placeholders keep the starter's names.
  const edited = BASE.replace('data-ss-id="direction-first" data-ss-thing="direction/first" data-ss-label="First"', 'data-ss-id="direction-night-watch" data-ss-thing="direction/night-watch" data-ss-label="Night &amp; Watch"');
  fs.writeFileSync(page, edited);
  assert.equal(fold(["push"]).status, 0);
  const named = fs.readFileSync(page, "utf8");
  // Only the first section changes: its pill's line, and its placeholder's marker, id and heading. "second" keeps its names.
  const expected = edited.replace('data-ss-say="Use First" title="Use First">', 'data-ss-say="Use Night &amp; Watch" title="Use Night &amp; Watch">').replace('<!-- part:first --><div class="drawing" data-ss-id="first-drawing"><h2>First</h2>', '<!-- part:night-watch --><div class="drawing" data-ss-id="night-watch-drawing"><h2>Night &amp; Watch</h2>').replace("<!-- /part:first -->", "<!-- /part:night-watch -->");
  assert.notEqual(expected, edited);
  assert.equal(named, expected);
  assert.equal(sent().at(-1).html, named, "the named page is the one pushed");
});

test("push names each pill after its section word for word, a name with $&, $` or $' too", () => {
  const { folder, fold } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const page = path.join(folder, "work", "index.html");
  const names = { first: ["cash-flow", "Cash $& Flow"], second: ["price-tag", "Price $` Tag"], third: ["tip-jar", "Tip $' Jar"] };
  let edited = BASE;
  for (const [old, [slug, name]] of Object.entries(names))
    edited = edited.replace(`data-ss-id="direction-${old}" data-ss-thing="direction/${old}" data-ss-label="${old[0].toUpperCase() + old.slice(1)}"`, () => `data-ss-id="direction-${slug}" data-ss-thing="direction/${slug}" data-ss-label="${name}"`);
  fs.writeFileSync(page, edited);
  assert.equal(fold(["push"]).status, 0);
  const named = fs.readFileSync(page, "utf8");
  for (const [slug, name] of Object.values(names)) {
    const section = named.match(new RegExp(`<section\\b[^>]*data-ss-id="direction-${slug}"[\\s\\S]*?</section>`));
    assert.ok(section, `section ${slug}`);
    assert.ok(section[0].includes(`data-ss-say="Use ${name}" title="Use ${name}">`), `pill of ${slug}: ${section[0].match(/<button[^>]*class="use-this[^>]*>/)}`);
    assert.ok(section[0].includes(`<h2>${name}</h2>`), `heading of ${slug}`);
  }
});

test("a new build saved with no part marker left gets a status naming its directions, and the log says why", () => {
  const { folder, fold, calls } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  fs.writeFileSync(path.join(folder, "work", "index.html"), '<!DOCTYPE html><title>Poster</title>' +
    ['sunny-bunting" data-ss-label="Sunny Bunting', 'stacked-type" data-ss-label="Stacked Type', 'long-table" data-ss-label="Long Table']
      .map((a) => `<section class="direction" data-ss-id="direction-${a}"><h1>Summer Street Party</h1></section>`).join(""));
  assert.equal(fold(["save", "Three poster looks", "Checking details"]).status, 0);
  const w = fold(["wait"]);
  assert.equal(w.status, 0, w.stdout + w.stderr);
  assert.match(w.stdout, /no part's status reached the person: the directions were drawn in work\/index\.html, not as parts/);
  assert.ok(calls().some((a) => a[0] === "live" && a.includes("Sunny Bunting, Stacked Type and Long Table are up. Checking details")), "the status names the three");
});

test("a page drawn as parts, or a revision of a space that held a design, keeps the save's own status", () => {
  for (const revision of [false, true]) {
    const { folder, fold, calls } = setup();
    assert.equal(fold(["start", "--new", "Poster"]).status, 0);
    const marker = revision ? "" : "<!-- part:bunting --><p>Drawn</p><!-- /part:bunting -->";
    if (revision) fs.rmSync(path.join(folder, "draw", "starter")); // as start <link> does on a space with a design
    fs.writeFileSync(path.join(folder, "work", "index.html"), `<!DOCTYPE html><title>Poster</title><section class="direction" data-ss-id="direction-bunting" data-ss-label="Bunting">${marker}</section>`);
    assert.equal(fold(["save", "Three directions", "Checking details"]).status, 0);
    const w = fold(["wait"]);
    assert.equal(w.status, 0, w.stdout + w.stderr);
    assert.doesNotMatch(w.stdout, /no part's status/);
    assert.ok(calls().some((a) => a[0] === "live" && a.at(-1) === "Checking details"), `revision ${revision}: the save's own status`);
  }
});

// The page sheep.new (and a space made empty) starts as: spacesheep's starterHtml("Untitled"), as it is.
const PLATFORM_BLANK = `<!doctype html>
<html lang="en" data-ss-id="root">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Untitled</title>
<style>
  html{background:#fff}
  body{margin:0;min-height:100vh;box-sizing:border-box;padding:48px clamp(20px,7vw,96px) 40vh;background:#fff;color:#1a1a1f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;line-height:1.6}
  body:not(:has(> :not(script,style,link,template,[class^="ss-"]))){background-image:radial-gradient(circle,#dcdfe5 1px,transparent 1.3px);background-size:22px 22px}
  h1{font-size:2rem;line-height:1.2;margin:0 0 .5em}
  h2{font-size:1.4rem;margin:1.2em 0 .4em}
  p,li{max-width:40em;margin:0 0 .7em}
</style>
</head>
<body data-ss-id="body"></body>
</html>`;

// start <link> on a page in the space: what it leaves in work/, and whether it laid the starter.
function startOn(page) {
  const { root, folder, fold } = setup();
  fs.writeFileSync(path.join(root, "page.html"), page);
  const r = fold(["start", "https://stage.test/s"], { FAKE_PAGE: path.join(root, "page.html") });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return { r, work: fs.readFileSync(path.join(folder, "work", "index.html"), "utf8"), starter: fs.existsSync(path.join(folder, "draw", "starter")) };
}

test("start on a known empty page lays down the starter: an empty file, sheep.new's page whatever its title, and start --new's first version", () => {
  const { root, fold } = setup();
  assert.equal(fold(["start", "--new", "Lift <notice>"]).status, 0);
  const pages = {
    "an empty file": "",
    "sheep.new": PLATFORM_BLANK,
    "sheep.new, another title": PLATFORM_BLANK.replace("<title>Untitled</title>", "<title>Summer party &amp; street fair</title>"),
    "start --new": fs.readFileSync(path.join(root, "first.html"), "utf8"),
  };
  for (const [name, page] of Object.entries(pages)) {
    const { r, work, starter } = startOn(page);
    assert.equal(work, starterAs("Untitled"), `${name}: the starter is in work/, with the space's own title`);
    assert.ok(starter, `${name}: draw/starter is written`);
    assert.match(r.stdout, /held no design: the starter is in its place\nnext: /, name);
  }
});

// start waits on nothing it doesn't need: in a new folder the page is read while the space's details come,
// and in a folder kept for another space nothing is read at all.
test("start reads the page beside the space's details in a new folder, and reads nothing in a folder kept for another space", () => {
  const { root, folder, fold, calls, sent } = setup();
  fs.writeFileSync(path.join(root, "page.html"), "");
  const r = fold(["start", "https://stage.test/s"], { FAKE_PAGE: path.join(root, "page.html"), FAKE_SLOW_GET: "1" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const times = fs.readFileSync(path.join(root, "times.log"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const at = (name, when) => (times.find((t) => t[0] === name && t[1] === when) || [])[2];
  assert.ok(at("read", "start") < at("spaces", "end"), "the read began before the space's details came back");
  assert.ok(sent().some((s) => s.html), "the empty canvas went up");
  assert.match(r.stdout, /^status: Reading your brief$/m);

  // spaces get refused while the page is still being read: start ends only once the read has landed, so
  // nothing reaches work/ after it has said it failed (a retry can't race a late write).
  const refused = setup();
  fs.writeFileSync(path.join(refused.root, "page.html"), "<!DOCTYPE html><title>late</title>");
  const g = refused.fold(["start", "https://stage.test/s"], { FAKE_PAGE: path.join(refused.root, "page.html"), FAKE_GET_REFUSED: "1", FAKE_SLOW_READ: "1" });
  assert.equal(g.status, 1, g.stdout + g.stderr);
  assert.match(g.stderr, /^start: spaces get https:\/\/stage\.test\/s refused: not_found/m);
  const late = path.join(refused.folder, "work", "index.html"), landed = fs.existsSync(late) && fs.statSync(late).mtimeMs;
  assert.ok(landed, "the read had landed when start ended");
  const until = Date.now() + 1500; while (Date.now() < until);
  assert.equal(fs.statSync(late).mtimeMs, landed, "nothing written after start ended");
  assert.ok(!fs.existsSync(path.join(refused.folder, "draw", "space")), "no space kept");

  const other = setup();
  fs.mkdirSync(path.join(other.folder, "draw"), { recursive: true });
  fs.writeFileSync(path.join(other.folder, "draw", "space"), "99999999-2222-4333-8444-555555555555");
  fs.writeFileSync(path.join(other.root, "page.html"), "");
  const o = other.fold(["start", "https://stage.test/s"], { FAKE_PAGE: path.join(other.root, "page.html") });
  assert.equal(o.status, 2, o.stdout + o.stderr);
  assert.match(o.stderr, /this folder is for space 99999999/);
  assert.ok(!other.calls().some((c) => c[0] === "read"), "nothing read into a folder kept for another space");
  assert.ok(!fs.existsSync(path.join(other.folder, "work", "index.html")), "work/ untouched");
});

const STARTER = fs.readFileSync(path.join(__dirname, "..", "design", "assets", "starter.html"), "utf8");
const looksEmpty = (html, name = "the starter") => {
  assert.match(html, /<meta name="ss-canvas" content="on">/, `${name}: the canvas is on`);
  assert.match(html, /class="frame-back" data-ss-canvas-back/, `${name}: the frame is there`);
  assert.doesNotMatch(html, /^<section class="direction"/m, `${name}: no direction yet`);
  assert.match(html, /device views: a direction's phone or tablet view/, `${name}: the starter's styles are whole`);
};
// The page is there at once: the canvas and its frame, no direction yet, beside the first status.
test("start puts the starter's empty canvas up at once, on a new space and on a blank page, and never over a design", () => {
  const emptyOf = (sent) => sent.filter((s) => s.html).map((s) => s.html);
  const looks = looksEmpty;
  const made = setup();
  assert.equal(made.fold(["start", "--new", "Poster $& sale"]).status, 0);
  const pushed = emptyOf(made.sent());
  assert.equal(pushed.length, 1, "start --new pushes one page");
  looks(pushed[0], "start --new");
  assert.equal(pushed[0].match(/<title>[^<]*<\/title>/g).join(), "<title>Poster $&amp; sale</title>", "the canvas carries the new space's title, $ and all");
  // The status and the canvas go up side by side, once the space exists: neither waits for the other.
  const log = made.calls(), made_ = log.findIndex((a) => a[0] === "deploy");
  const status = log.findIndex((a) => a[0] === "live" && a.includes("Reading your brief")), canvas = log.findIndex((a) => a[0] === "call" && a[1] === "push_live");
  assert.ok(made_ >= 0 && status > made_ && canvas > made_, "the status and the canvas go up after the space is made");
  for (const [name, page] of Object.entries({ blank: PLATFORM_BLANK, design: '<!DOCTYPE html><title>Poster</title><section class="direction" data-ss-section data-ss-id="direction-bunting"><h1 data-ss-id="bunting-title">Summer Street Party</h1></section>' })) {
    const one = setup();
    fs.writeFileSync(path.join(one.root, "page.html"), page);
    assert.equal(one.fold(["start", "https://stage.test/s"], { FAKE_PAGE: path.join(one.root, "page.html") }).status, 0);
    const sent = emptyOf(one.sent());
    if (name === "design") assert.equal(sent.length, 0, "a design gets no empty canvas over it");
    else {
      assert.equal(sent.length, 1, name); looks(sent[0], name); assert.match(sent[0], /<title>Untitled<\/title>/, `${name}: the canvas keeps the space's title`);
      // Spacesheep shows the skill's starter (spacesheep.yaml's starter:) on a blank page before the session is up,
      // with the space's title: start's empty canvas is the same page, so pushing it again changes nothing.
      assert.equal(sent[0], STARTER.replace(/<title>[^<]*<\/title>/, "<title>Untitled</title>"),
        "assets/starter.html is base.html without its directions, as start pushes it: after a change to base.html, write it again from base.html");
    }
  }
});

test("spacesheep.yaml names the starter Spacesheep shows on a blank page, and it is the empty canvas", () => {
  const yaml = fs.readFileSync(path.join(__dirname, "..", "design", "spacesheep.yaml"), "utf8");
  assert.match(yaml, /^starter: assets\/starter\.html$/m);
  looksEmpty(STARTER);
});

// The space's title is the person's: start keeps it, and only `title`, on their pick, changes it.
test("start keeps the space's own title in the page and says so; title renames the space and the page, and nothing else", () => {
  const { root, folder, fold, calls } = setup();
  fs.writeFileSync(path.join(root, "page.html"), "");
  const r = fold(["start", "https://stage.test/s"], { FAKE_PAGE: path.join(root, "page.html") });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^title: Untitled \(the person's: keep it\)$/m);
  const page = path.join(folder, "work", "index.html"), before = fs.readFileSync(page, "utf8");
  assert.equal(before, starterAs("Untitled"));
  assert.ok(!calls().some((a) => a[0] === "spaces" && a[1] === "update"), "start renames nothing");
  const t = fold(["title", "Winter Talks <2026> $& $' $`"]);
  assert.equal(t.status, 0, t.stderr);
  assert.deepEqual(calls().filter((a) => a[0] === "spaces" && a[1] === "update"), [["spaces", "update", SPACE, "--title", "Winter Talks <2026> $& $' $`"]]);
  assert.equal(fs.readFileSync(page, "utf8"), before.replace("<title>Untitled</title>", () => "<title>Winter Talks &lt;2026&gt; $&amp; $' $`</title>"));
  assert.equal(fold(["title"]).status, 2, "a title is needed");
});

test("start keeps every other page, however empty it looks: a design, words, a picture, a script, CSS that draws, any mark added to sheep.new's page", () => {
  const body = (inner, attrs = "") => PLATFORM_BLANK.replace('<body data-ss-id="body"></body>', `<body data-ss-id="body"${attrs}>${inner}</body>`);
  const pages = {
    design: '<!DOCTYPE html><title>Poster</title><section class="direction" data-ss-section data-ss-id="direction-bunting"><h1 data-ss-id="bunting-title">Summer Street Party</h1></section>',
    "no data-ss-id": "<!DOCTYPE html><title>Notice</title><p>The lift is out of service.</p>",
    "words on sheep.new's page": body("<p>Poster for the street party, 18 July</p>"),
    "an image": body('<img src="photo.jpg" alt="">'),
    "drawn by a script": body('<script>document.body.append("Open daily")</script>'),
    "a script in the head": PLATFORM_BLANK.replace("</head>", '<script>addEventListener("load", () => document.body.append("Open daily"))</script>\n</head>'),
    "words from CSS": PLATFORM_BLANK.replace("</style>", '  body::before { content: "Open daily" }\n</style>'),
    "a picture from CSS": body("", ' style="background: url(photo.jpg) center / cover"'),
    "a picture from CSS, unquoted": body("", " style=background:url(poster.png)"),
    "a picture from an attribute": body("", ' background="poster.png"'),
    "an outside stylesheet": PLATFORM_BLANK.replace("</head>", '<link rel="stylesheet" href="https://example.com/poster.css">\n</head>'),
    "words in a .ss- mark": body('<p class="ss-note">Keep me</p>'),
    "an empty .ss- mark that draws": body('<div class="ss-poster" style="width:200px;height:200px;background:red"></div>'),
    "the platform's own marks": body('\n<style data-ss-id="ss-style">p{color:red}</style>\n<div class="ss-mark"></div>\n'),
    "words after </body>": PLATFORM_BLANK.replace("</html>", "<p>Open daily</p>\n</html>"),
  };
  for (const [name, page] of Object.entries(pages)) {
    const { r, work, starter } = startOn(page);
    assert.equal(work, page, `${name}: work/ holds the page as it was`);
    assert.ok(!starter, `${name}: no draw/starter`);
    assert.doesNotMatch(r.stdout, /starter/, name);
  }
});

// fold.js keeps a copy of Spacesheep's new page. Run with SPACESHEEP_SRC=<the spacesheep repo> to check the copy
// against the platform's starterHtml: if they drift, start reads a new page as a design, the agent lays the
// starter by hand, and this test says so.
test("fold.js's copy of Spacesheep's new page matches starterHtml", { skip: !process.env.SPACESHEEP_SRC && "set SPACESHEEP_SRC to the spacesheep repo" }, () => {
  const src = fs.readFileSync(path.join(process.env.SPACESHEEP_SRC, "packages", "app", "src", "index.ts"), "utf8");
  const theirs = /function starterHtml\(title: string\): string \{\n  return `([\s\S]*?)`;\n\}/.exec(src);
  assert.ok(theirs, "starterHtml not found in packages/app/src/index.ts");
  const ours = /const platformBlank = \(title\) => `([\s\S]*?)`;/.exec(fs.readFileSync(FOLD, "utf8"));
  assert.equal(ours[1], theirs[1].replace("${escapeHtml(title)}", "${title}"));
  assert.equal(PLATFORM_BLANK, theirs[1].replace("${escapeHtml(title)}", "Untitled"));
});

test("focus sets the canvas's focus meta, and nothing else, then pushes the page; all puts it back", () => {
  const { folder, fold, sent } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const page = path.join(folder, "work", "index.html");
  const edited = BASE.replace('data-ss-id="direction-first" data-ss-thing="direction/first"', 'data-ss-id="direction-night-watch" data-ss-thing="direction/night-watch"');
  fs.writeFileSync(page, edited);
  assert.match(edited, /<meta name="ss-canvas-focus" content="all">/);
  const r = fold(["focus", "night-watch"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^focus: direction-night-watch, pushed$/m);
  const focused = edited.replace('<meta name="ss-canvas-focus" content="all">', '<meta name="ss-canvas-focus" content="direction-night-watch">');
  assert.equal(fs.readFileSync(page, "utf8"), focused);
  assert.equal(sent().at(-1).html, focused, "the focused page is the one pushed");
  assert.equal(fold(["focus", "all"]).status, 0);
  assert.equal(fs.readFileSync(page, "utf8"), edited);
});

test("focus refuses a direction the page doesn't have, and changes and pushes nothing", () => {
  const { folder, fold, sent } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const before = sent().length;
  const r = fold(["focus", "night-watch"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /focus: give all or a direction on the page \(first, second, third\)/);
  assert.equal(fs.readFileSync(path.join(folder, "work", "index.html"), "utf8"), starterAs("Poster"));
  assert.equal(sent().length, before, "nothing pushed");
});

test("focus gives a page from before the meta its focus beside the ss-canvas meta, in the writer's frame too", () => {
  const { folder, fold } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const old = BASE.replace('<meta name="ss-canvas-focus" content="all">\n', "");
  for (const f of [["work", "index.html"], ["draw", "frame.html"]]) fs.writeFileSync(path.join(folder, ...f), old);
  assert.equal(fold(["focus", "second"]).status, 0);
  for (const f of [["work", "index.html"], ["draw", "frame.html"]])
    assert.equal(fs.readFileSync(path.join(folder, ...f), "utf8"), old.replace('<meta name="ss-canvas" content="on">', '<meta name="ss-canvas" content="on">\n<meta name="ss-canvas-focus" content="direction-second">'), f.join("/"));
});

test("a revision's first status: read's words (Reading your design unless given) go up before it reads; start's, when given, go up beside its read, and start pushes no page over the design", () => {
  const { root, folder, fold, calls } = setup();
  const design = BASE.replace("<title>", "<title>Street party · ");
  fs.writeFileSync(path.join(root, "page.html"), design);
  const env = { FAKE_PAGE: path.join(root, "page.html") };
  const r = fold(["start", "https://stage.test/s", "Making Big Day's 18 red"], env);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^status: Making Big Day's 18 red$/m);
  let log = calls();
  // start's calls run side by side, so its status isn't ordered against its read; it goes up, and no page does.
  assert.ok(log.some((a) => a[0] === "live" && a.includes("Making Big Day's 18 red")), "start's status went up");
  assert.ok(!log.some((a) => a[0] === "call" && a[1] === "push_live"), "start pushed nothing over the design");
  assert.ok(!log.some((a) => a.includes("Reading your brief")), "no brief status on a revision given its own words");
  for (const [args, words] of [[["read", "Making the 18 red"], "Making the 18 red"], [["read"], "Reading your design"]]) {
    const n = calls().length;
    const s = fold(args, env);
    assert.equal(s.status, 0, s.stdout + s.stderr);
    assert.match(s.stdout, new RegExp(`^status: ${words}$`, "m"));
    log = calls().slice(n);
    const at = log.findIndex((a) => a[0] === "live" && a.includes("--status") && a.includes(words));
    assert.ok(at >= 0, `${words}: pushed`);
    assert.ok(at < log.findIndex((a) => a[0] === "read"), `${words}: before the read`);
  }
  assert.equal(fs.readFileSync(path.join(folder, "draw", "card"), "utf8").trim(), "up", "the work card is up until a save");
  assert.equal(fold(["read", "-x"], env).status, 2, "a status can't start with -");
});

test("a save stopped at its time limit is saved only when a version with its message is newer than the space's newest before it", () => {
  const limit = { FOLD_SAVE_MS: "1500" };
  const again = "save again: if it landed after all, that save makes no second version";
  // The version landed before the CLI was stopped: a save, which goes on to its status and push.
  let { fold, calls } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  assert.equal(fold(["save", "Big Day, red 18", "Checking details"], { ...limit, FAKE_HANG: "landed" }).status, 0);
  let w = fold(["wait"]);
  assert.equal(w.status, 0, w.stdout + w.stderr);
  assert.match(w.stdout, /saved: Saved as version 2\. The server answered late: fold\.js stopped the CLI at 2 s, after the version was made\./);
  assert.match(w.stdout.trim().split("\n").pop(), /save done$/);
  let log = calls();
  const deployed = log.findIndex((a) => a[0] === "deploy" && a.includes("Big Day, red 18"));
  const reads = log.map((a, i) => (a[0] === "versions" && a.includes("--space-id") && a.includes(SPACE) ? i : -1)).filter((i) => i >= 0);
  assert.equal(reads.length, 2, "the history was read twice");
  assert.ok(reads[0] < deployed && log[reads[0]].includes("1"), "its newest version was read before the deploy");
  assert.ok(reads[1] > deployed, "and the history again after it");
  assert.ok(log.findIndex((a) => a[0] === "live" && a.includes("Checking details")) > reads[1], "the save went on to its status");
  // No version from this save: the only one with its message was made 10 s before it, so it isn't this
  // save's. Or a history that can't be read, before or after: a failure that says so, even when it landed.
  const before = "the space's history couldn't be read before the save (forbidden: This account may not do this here.)";
  for (const [more, said] of [
    [{ FAKE_HANG: "lost" }, `no answer from the server in 2 s, and the space has no version "Big Day, red 18" newer than its newest before this save; ${again}`],
    [{ FAKE_HANG: "lost", FAKE_HISTORY: "refused" }, `no answer from the server in 2 s, and ${before}; ${again}`],
    [{ FAKE_HANG: "landed", FAKE_HISTORY: "before" }, `no answer from the server in 2 s, and ${before}; ${again}`],
    [{ FAKE_HANG: "landed", FAKE_HISTORY: "after" }, `no answer from the server in 2 s, and the space's history can't be read (forbidden: This account may not do this here.); ${again}`],
  ]) {
    ({ fold, calls } = setup());
    assert.equal(fold(["start", "--new", "Poster"]).status, 0);
    assert.equal(fold(["save", "Big Day, red 18", "Checking details"], { ...limit, ...more }).status, 0);
    w = fold(["wait"]);
    assert.equal(w.status, 1, `wait must fail on a save that didn't land or can't be shown to (${JSON.stringify(more)})`);
    assert.equal(w.stdout.trim().split("\n").pop().slice(9), `save failed: ${said}`);
    assert.ok(!calls().some((a) => a[0] === "live" && a.includes("Checking details")), "a failed save puts no status back");
  }
});

// A build drawn as parts and saved: the Programme starts at 2pm, and the writer's frame and part stay in draw/.
function built() {
  const t = setup();
  const { root, folder, fold } = t;
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  fs.writeFileSync(path.join(folder, "work", "index.html"),
    '<!DOCTYPE html><title>Poster</title><section class="direction" data-ss-id="direction-programme" data-ss-label="Programme"><!-- part:programme --><p>Drawing</p><!-- /part:programme --></section>');
  fs.mkdirSync(path.join(folder, "draw", "programme"));
  fs.writeFileSync(path.join(folder, "draw", "programme", "01.html"), '<!-- status: Programme: the times -->\n<p data-ss-id="programme-times">Music from 2pm, food from 3pm, dancing from 5pm</p>\n');
  spawnSync("sleep", ["0.5"]);
  assert.equal(fold(["write"]).status, 0);
  const s = fold(["stop", "Programme poster"]);
  assert.equal(s.status, 0, s.stdout + s.stderr);
  const saved = fs.readFileSync(path.join(root, "deployed.html"), "utf8");
  assert.match(saved, /Music from 2pm/);
  return { ...t, saved };
}

test("a revision's save sends the page as read and edited: the last build's frame and parts are put aside, never folded back over it", () => {
  const { root, folder, fold, calls, saved } = built();
  fs.writeFileSync(path.join(root, "page.html"), saved);
  const r = fold(["read", "Making the Programme start at 3pm"], { FAKE_PAGE: path.join(root, "page.html") });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /the last build's frame and parts are put aside in draw\/_old\/[^:]+: edit work\/index\.html/);
  assert.ok(!fs.existsSync(path.join(folder, "draw", "frame.html")) && !fs.existsSync(path.join(folder, "draw", "programme")), "nothing left to fold");
  const [old] = fs.readdirSync(path.join(folder, "draw", "_old"));
  assert.ok(fs.existsSync(path.join(folder, "draw", "_old", old, "frame.html")), "the frame is kept aside");
  assert.match(fs.readFileSync(path.join(folder, "draw", "_old", old, "programme", "01.html"), "utf8"), /Music from 2pm/, "and the part");
  // The session's edit, in work/index.html, as section 7 says.
  const page = path.join(folder, "work", "index.html");
  fs.writeFileSync(page, fs.readFileSync(page, "utf8").replace("Music from 2pm, food from 3pm, dancing from 5pm", "Music from 3pm, food from 4pm, dancing from 6pm"));
  assert.equal(fold(["save", "Programme starts at 3pm", "Programme now starts at 3pm"]).status, 0);
  const w = fold(["wait"]);
  assert.equal(w.status, 0, w.stdout + w.stderr);
  assert.doesNotMatch(w.stdout, /folded/);
  const sent = fs.readFileSync(path.join(root, "deployed.html"), "utf8");
  assert.match(sent, /Music from 3pm/, "the save carries the edit");
  assert.doesNotMatch(sent, /Music from 2pm/);
  // A later writer takes its frame from that page, and no old part folds back in.
  const n = calls().length;
  assert.equal(fold(["write"]).status, 0);
  const s = fold(["stop", "Programme, again"]);
  assert.equal(s.status, 0, s.stdout + s.stderr);
  assert.ok(calls().slice(n).some((a) => a[0] === "deploy"), "stop saved");
  assert.match(fs.readFileSync(path.join(root, "deployed.html"), "utf8"), /Music from 3pm/);
});

test("a revision's read moves only a part's own files: a part named after fold.js's files (space, card, stop, starter, old, _old) leaves those files where they are", () => {
  const t = setup();
  const { root, folder, fold, calls } = t;
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const names = ["space", "card", "stop", "starter", "old", "programme"];
  const parts = names.map((n) => `<!-- part:${n} --><p>Drawing</p><!-- /part:${n} -->`).join("") + "<!-- part:_old --><!-- /part:_old -->";
  fs.writeFileSync(path.join(folder, "work", "index.html"), `<!DOCTYPE html><title>Poster</title><section class="direction" data-ss-id="direction-programme" data-ss-label="Programme">${parts}</section>`);
  fs.writeFileSync(path.join(folder, "draw", "frame.html"), fs.readFileSync(path.join(folder, "work", "index.html")));
  // The parts a writer would read: a folder for "old" and "programme", an older page's files for "programme".
  for (const d of ["old", "programme"]) { fs.mkdirSync(path.join(folder, "draw", d)); fs.writeFileSync(path.join(folder, "draw", d, "01.html"), `<p>${d}: the times</p>\n`); }
  fs.writeFileSync(path.join(folder, "draw", "programme.html"), "<p>older page</p><!-- end programme -->");
  fs.writeFileSync(path.join(folder, "draw", "programme.status"), "Programme: the times\n");
  fs.writeFileSync(path.join(folder, "draw", "space.html"), "<p>a part's older page</p>"); // a file of the part "space", moved
  const own = ["space", "starter"].map((f) => [f, fs.readFileSync(path.join(folder, "draw", f), "utf8")]);
  fs.writeFileSync(path.join(root, "page.html"), fs.readFileSync(path.join(folder, "work", "index.html")));
  for (const round of [1, 2]) { // twice: the second read finds the first one's draw/_old/ and the part "old" already moved
    if (round === 2) { fs.writeFileSync(path.join(folder, "draw", "frame.html"), "<!-- part:old --><!-- /part:old --><!-- part:_old --><!-- /part:_old -->"); spawnSync("sleep", ["0.01"]); }
    const r = fold(["read", "Moving the Programme"], { FAKE_PAGE: path.join(root, "page.html") });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  }
  for (const [f, text] of own) assert.equal(fs.readFileSync(path.join(folder, "draw", f), "utf8"), text, `draw/${f} stays`);
  assert.equal(fs.readFileSync(path.join(folder, "draw", "card"), "utf8").trim(), "up", "draw/card stays, as read's status left it");
  assert.ok(!fs.existsSync(path.join(folder, "draw", "stop")), "no draw/stop appears");
  const kept = fs.readdirSync(path.join(folder, "draw", "_old")).sort();
  assert.equal(kept.length, 2, "one folder per read, and draw/_old/ itself never moved");
  const first = path.join(folder, "draw", "_old", kept[0]);
  assert.deepEqual(fs.readdirSync(first).sort(), ["frame.html", "old", "programme", "programme.html", "programme.status", "space.html"]);
  assert.equal(fs.readFileSync(path.join(first, "old", "01.html"), "utf8"), "<p>old: the times</p>\n");
  assert.deepEqual(fs.readdirSync(path.join(folder, "draw", "_old", kept[1])), ["frame.html"]);
  // The folder still saves: draw/space is still its space.
  const n = calls().length;
  assert.equal(fold(["save", "Programme moved", "Programme moved"]).status, 0);
  const w = fold(["wait"]);
  assert.equal(w.status, 0, w.stdout + w.stderr);
  assert.ok(calls().slice(n).some((a) => a[0] === "deploy"), "the save deployed");
});

test("a save or stop never folds draw/ over an edit made in work/index.html since fold.js wrote it: it fails, says where to edit, and saves nothing", () => {
  const { root, folder, fold, calls } = built();
  const page = path.join(folder, "work", "index.html");
  fs.writeFileSync(page, fs.readFileSync(page, "utf8").replace("Music from 2pm", "Music from 3pm"));
  // The frame has moved on since (a renamed heading), so folding would undo the edit.
  const frame = path.join(folder, "draw", "frame.html");
  fs.writeFileSync(frame, fs.readFileSync(frame, "utf8").replace("<title>Poster</title>", "<title>Street party poster</title>"));
  const n = calls().length;
  assert.equal(fold(["save", "Programme starts at 3pm", "Checking"]).status, 0);
  const w = fold(["wait"]);
  assert.equal(w.status, 1, "wait must fail");
  assert.equal(w.stdout.trim().split("\n").pop().slice(9), "save failed: work/index.html was changed after fold.js last wrote it, and folding draw/ (the frame and its parts) over it would undo that change. Make the change in draw/frame.html, or in the part it belongs to (draw/<slug>/NN.html), then save again");
  const s = fold(["stop", "Programme starts at 3pm"]);
  assert.equal(s.status, 1);
  assert.match(s.stderr, /^stop: work\/index\.html was changed after fold\.js last wrote it.*; nothing saved$/m);
  assert.ok(!calls().slice(n).some((a) => a[0] === "deploy" || (a[0] === "call" && a[1] === "push_live")), "no save and no page push");
  assert.match(fs.readFileSync(page, "utf8"), /Music from 3pm/, "the edit is still there");
  assert.match(fs.readFileSync(path.join(root, "deployed.html"), "utf8"), /Music from 2pm/, "the space keeps its version");
});

test("a save pushes the page after its upload only when it changed during it, so the saved version isn't marked live again", () => {
  for (const touch of [false, true]) {
    const { folder, fold, calls, sent } = setup();
    assert.equal(fold(["start", "--new", "Poster"]).status, 0);
    fs.writeFileSync(path.join(folder, "work", "index.html"), '<!DOCTYPE html><title>Poster</title><section class="direction" data-ss-id="direction-bunting" data-ss-label="Bunting"><p>Street party</p></section>');
    assert.equal(fold(["save", "Bunting", "Checking details"], touch ? { FAKE_TOUCH: "1" } : {}).status, 0);
    const w = fold(["wait"]);
    assert.equal(w.status, 0, w.stdout + w.stderr);
    const log = calls(), deployed = log.findIndex((a) => a[0] === "deploy" && a.includes("Bunting"));
    const k = log.slice(0, deployed).filter((a) => a[0] === "call").length; // push_live calls before the deploy
    const after = sent().slice(k).filter((x) => "html" in x);
    assert.ok(log.slice(deployed).some((a) => a[0] === "live" && String(a.at(-1)).endsWith("Checking details")), "the status still goes after the save");
    if (!touch) {
      assert.deepEqual(after, [], "no page push after an unchanged save");
      assert.doesNotMatch(w.stdout, /pushed the page again/);
    } else {
      assert.equal(after.length, 1);
      assert.match(after[0].html, /folded during the save -->$/, "the newer page is pushed");
      assert.match(w.stdout, /pushed the page again: it changed during the save/);
    }
  }
});

test("SKILL.md's fetch command writes a file whole, asking page by page as the store serves it", () => {
  // A stand-in npx that answers `skills get … --path <file> --offset <n> --json` as the store does: a page of the file
  // counted in code points, and next_offset, 0 once the file has ended.
  const SKILL = path.join(__dirname, "..", "design");
  const line = fs.readFileSync(path.join(SKILL, "SKILL.md"), "utf8").split("\n").find((l) => l.startsWith("**Getting this skill:**"));
  const cmd = line.match(/a file is fetched with `(.+? > <where>)`/)[1];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fetch-test-")), bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "npx"), `#!/usr/bin/env node
const fs = require("fs"), path = require("path"), a = process.argv.slice(2);
fs.appendFileSync(path.join(process.env.FAKE_DIR, "calls.log"), JSON.stringify(a) + "\\n");
const file = a[a.indexOf("--path") + 1], o = a.indexOf("--offset"), at = o < 0 ? 0 : Number(a[o + 1]), page = Number(process.env.FAKE_PAGE);
const all = Array.from(fs.readFileSync(path.join(process.env.FAKE_SKILL, file), "utf8")), end = Math.min(at + page, all.length);
console.log(JSON.stringify({ file: { path: file, text: all.slice(at, end).join(""), media_type: "text/plain" }, next_offset: end < all.length ? end : 0 }));
`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_DIR: root, FAKE_SKILL: SKILL, FAKE_PAGE: "20000" };
  for (const file of ["assets/fold.js", "assets/base.html", "SKILL.md"]) {
    fs.rmSync(path.join(root, "calls.log"), { force: true });
    const out = path.join(root, path.basename(file));
    const r = spawnSync("sh", ["-c", cmd.replace("<file>", file).replace("<where>", out)], { env, encoding: "utf8", timeout: 60000 });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.readFileSync(out).equals(fs.readFileSync(path.join(SKILL, file))), `${file} is written whole`);
    const n = Array.from(fs.readFileSync(path.join(SKILL, file), "utf8")).length;
    const offsets = fs.readFileSync(path.join(root, "calls.log"), "utf8").trim().split("\n").map((l) => { const a = JSON.parse(l), o = a.indexOf("--offset"); return o < 0 ? 0 : Number(a[o + 1]); });
    assert.deepEqual(offsets, Array.from({ length: Math.ceil(n / 20000) }, (_, i) => i * 20000), `${file}: one call a page, each from the last answer's next_offset`);
  }
  // fold.js and base.html are each more than one page at the store's size, so one call would cut them.
  for (const file of ["assets/fold.js", "assets/base.html"]) assert.ok(fs.statSync(path.join(SKILL, file)).size > 36000, file);
});

test("SKILL.md puts up a status naming the fetch before the first file is fetched", () => {
  // The fetch is the run's longest quiet stretch before fold.js's first status: the line says so on the page first.
  const line = fs.readFileSync(path.join(__dirname, "..", "design", "SKILL.md"), "utf8").split("\n").find((l) => l.startsWith("**Getting this skill:**"));
  const cmd = line.match(/`(npx -y spacesheep@latest live push [^`]+)`/)[1];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fetch-status-test-")), bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "npx"), `#!/usr/bin/env node
require("fs").appendFileSync(require("path").join(process.env.FAKE_DIR, "calls.log"), JSON.stringify(process.argv.slice(2)) + "\\n");
`, { mode: 0o755 });
  const link = "https://spacesheep.dev/@someone/poster";
  const r = spawnSync("sh", ["-c", cmd.replace("<link>", link)], { env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_DIR: root }, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "calls.log"), "utf8")), ["-y", "spacesheep@latest", "live", "push", "--space", link, "--status", "Fetching the Design skill"]);
  assert.ok(line.indexOf(cmd) < line.indexOf("Read a reference only"), "said in the fetch's own paragraph");
});

test("a save with pictures takes a direction at 1440 and 390, and each of its device views once, at its frame's width", () => {
  const { folder, fold, calls } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  fs.writeFileSync(path.join(folder, "work", "index.html"), '<!DOCTYPE html><title>Poster</title>'
    + '<section class="direction" data-ss-frame="desktop" data-ss-id="direction-bunting" data-ss-label="Bunting"><p>Street party</p></section>'
    + '<section class="direction" data-view-of="bunting" data-ss-frame="phone" data-ss-id="direction-bunting-phone" data-ss-label="Bunting · Phone"><p>Street party</p></section>'
    + '<section class="direction" data-view-of="bunting" data-ss-frame="tablet" data-ss-id="direction-bunting-tablet" data-ss-label="Bunting · Tablet"><p>Street party</p></section>');
  assert.equal(fold(["save", "Bunting", "Checking details", "pictures"], { FAKE_SHOT: "1" }).status, 0);
  const w = fold(["wait"]);
  assert.equal(w.status, 0, w.stdout + w.stderr);
  const at = (a, k) => a[a.indexOf(k) + 1];
  const shots = calls().filter((a) => a[0] === "spaces" && a[1] === "screenshot").map((a) => `${at(a, "--section")} ${at(a, "--width")}x${at(a, "--height")}`).sort();
  assert.deepEqual(shots, ["direction-bunting 1440x1000", "direction-bunting 390x844", "direction-bunting-phone 390x844", "direction-bunting-tablet 820x1180"]);
  assert.match(w.stdout, /pictures done: 4 pictures, no layout faults/);
  for (const f of ["bunting-1440.png", "bunting-390.png", "bunting-phone-390.png", "bunting-tablet-820.png"]) assert.ok(fs.existsSync(path.join(folder, f)), f);
});

test("kit brings a page made before device views up to the starter's switcher and container rules, and changes nothing else", () => {
  const { folder, fold, calls } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  // The starter as it was: a switcher that tabs every section, no device row, kit rules on the window's width.
  const span = /\/\* switcher: start \*\/[\s\S]*?\/\* switcher: end \*\//g;
  const was = ["/* switcher: start */\n  .switcher { position: sticky; }\n  /* switcher: end */",
    "/* switcher: start */\n(() => { const all = () => [...document.querySelectorAll('section.direction')]; })();\n/* switcher: end */"];
  let i = 0;
  const old = BASE.replace(span, () => was[i++]).replace(/\n *<div class="switcher-views"[^>]*><\/div>/, "")
    .replace(/@container \(max-width: 40rem\)/g, "@media (max-width: 40rem)").replace("5cqi", "5vw");
  assert.equal(i, 2);
  assert.notEqual(old, BASE);
  const page = path.join(folder, "work", "index.html");
  fs.writeFileSync(page, old);
  const n = calls().length;
  const r = fold(["kit"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^kit: the switcher, the device buttons' row, the kit's phone rules and the layout check are now the starter's; nothing pushed$/m);
  assert.equal(fs.readFileSync(page, "utf8"), BASE);
  assert.match(fold(["kit"]).stdout, /^kit: already current$/m);
  assert.equal(calls().length, n, "kit pushes nothing");
  fs.writeFileSync(page, "<!DOCTYPE html><title>Poster</title><section class=\"direction\" data-ss-id=\"direction-bunting\"></section>");
  const bare = fold(["kit"]);
  assert.equal(bare.status, 2);
  assert.match(bare.stderr, /^kit: work\/index\.html has no starter switcher/m);
});

test("kit gives a page with no layout check the starter's, so the save's pictures are measured; a marked one becomes the starter's", () => {
  const { folder, fold, calls } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const check = /\/\* check: start \*\/[\s\S]*?\/\* check: end \*\//;
  const [mark] = BASE.match(check);
  const page = path.join(folder, "work", "index.html");
  // A page from before the check: nothing in it asks for ss-fault/, so a save could measure nothing.
  const old = BASE.replace(check, "");
  assert.doesNotMatch(old, /ss-fault\//);
  fs.writeFileSync(page, old);
  const n = calls().length;
  const r = fold(["kit"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^kit: the switcher, the device buttons' row, the kit's phone rules and the layout check are now the starter's; nothing pushed$/m);
  const out = fs.readFileSync(page, "utf8");
  assert.equal(out.split(mark).length, 2, "the starter's check, once");
  assert.ok(out.includes(`<script>\n${mark}\n</script>\n</body>`), "in a <script> of its own, before </body>");
  assert.match(fold(["kit"]).stdout, /^kit: already current$/m);
  // A marked check from an earlier starter is replaced by the starter's, in place.
  fs.writeFileSync(page, BASE.replace(check, "/* check: start */\nif (false) {}\n/* check: end */"));
  assert.equal(fold(["kit"]).status, 0);
  assert.equal(fs.readFileSync(page, "utf8"), BASE);
  // An unmarked check measures already: it stays as it is, and no second one is added.
  const unmarked = BASE.replace("/* check: start */\n", "").replace("/* check: end */\n", "");
  fs.writeFileSync(page, unmarked);
  assert.match(fold(["kit"]).stdout, /^kit: already current$/m);
  assert.equal(fs.readFileSync(page, "utf8"), unmarked);
  assert.equal(calls().length, n, "kit pushes nothing");
});

test("a folder from before run records gets them, as none, from the next command once no save or writer runs in it", async () => {
  const { root, folder, fold } = setup();
  assert.equal(fold(["start", "--new", "Notice"]).status, 0);
  const rec = (n) => path.join(folder, "draw", `${n}.run`);
  for (const n of ["writer", "save"]) fs.rmSync(rec(n));
  // A process that looks like a save, working in this folder: the records stay missing and nothing starts.
  const hold = (cwd) => require("child_process").spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)", "fold.js", "save", "Frame"], { cwd, stdio: "ignore" });
  const end = (p) => { const gone = new Promise((ok) => p.once("exit", ok)); p.kill("SIGKILL"); return gone; };
  const here = hold(folder);
  try {
    const r = fold(["save", "Frame"]);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(`^draw/writer\\.run and draw/save\\.run missing, and a run may be going in this folder \\(process ${here.pid}: .*fold\\.js save Frame\\)`, "m"));
    assert.match(r.stderr, /^save: draw\/save\.run is missing, so fold\.js can't tell whether a save is still running here; it may be\. Nothing started/m);
    assert.ok(!fs.existsSync(rec("save")) && !fs.existsSync(rec("writer")));
  } finally { await end(here); }
  // The same process in another folder doesn't hold this one; with this one's gone, the records are set up.
  const there = hold(root);
  try {
    const r = fold(["wait"]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^set up draw\/writer\.run and draw\/save\.run as none: this folder is from before fold\.js kept run records, and no save or writer is running in it$/m);
    assert.match(r.stdout, /^no save has run$/m);
  } finally { await end(there); }
  for (const n of ["writer", "save"]) assert.equal(fs.readFileSync(rec(n), "utf8"), "none\n");
  assert.doesNotMatch(fold(["wait"]).stdout, /set up/, "once only");
  // A record that is there but holds no run is still unknown: only a missing one is set up.
  fs.writeFileSync(rec("save"), "garbage\n");
  const g = fold(["wait"]);
  assert.equal(g.status, 1);
  assert.match(g.stdout, /^can't tell whether a save is running or how it went: draw\/save\.run doesn't hold a run/m);
});

test("a run's record written by another command while an older folder's processes are listed is never replaced by none", () => {
  const { root, folder, fold } = setup();
  assert.equal(fold(["start", "--new", "Notice"]).status, 0);
  const rec = (n) => path.join(folder, "draw", `${n}.run`);
  for (const n of ["writer", "save"]) fs.rmSync(rec(n));
  // A stand-in ps: as fold.js lists the processes, another command writes its save's record (begin's first write,
  // no process group yet), then the list shows nothing that runs here. Its folder is fold.js's.
  const run = `0123456789abcdef ${Date.now() + 600000} -\n`;
  fs.writeFileSync(path.join(root, "bin", "ps"), `#!/bin/sh\nprintf '%s\\n' '${run.trim()}' > draw/save.run\necho "    1     0 /sbin/launchd"\n`, { mode: 0o755 });
  const r = fold(["kit"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(fs.readFileSync(rec("save"), "utf8"), run, "the run's record stays");
  assert.equal(fs.readFileSync(rec("writer"), "utf8"), "none\n", "the record nobody wrote is set up");
  assert.match(r.stdout, /^set up draw\/writer\.run as none: /m);
  assert.match(r.stdout, /^draw\/save\.run appeared while the processes were checked \(another fold\.js command wrote it\): left as it is$/m);
  assert.deepEqual(fs.readdirSync(path.join(folder, "draw")).filter((f) => f.endsWith(".new")), [], "no copy left behind");
});

test("kit gives a one-design page that dropped the switcher's tabs, script and nav the script and a device row", () => {
  const { folder, fold, calls } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  // One design as the starter said before views: one section, no tabs, no switcher script, no nav.
  const span = /\/\* switcher: start \*\/[\s\S]*?\/\* switcher: end \*\//g;
  const [styles, script] = BASE.match(span);
  const old = BASE.replace(styles, "/* switcher: start */\n  .switcher { position: sticky; }\n  /* switcher: end */").replace(script, "")
    .replace(/\n<nav\b[\s\S]*?<\/nav>\n/, "\n")
    .replace(/\n<section class="direction"[^>]*data-ss-id="direction-second"[\s\S]*?<\/section>\n/, "\n")
    .replace(/\n<section class="direction"[^>]*data-ss-id="direction-third"[\s\S]*?<\/section>\n/, "\n")
    .replace(/@container \(max-width: 40rem\)/g, "@media (max-width: 40rem)").replace("5cqi", "5vw");
  assert.equal((old.match(span) || []).length, 1);
  assert.doesNotMatch(old, /<nav\b|class="switcher-tabs"|<section[^>]*direction-second/);
  const page = path.join(folder, "work", "index.html");
  fs.writeFileSync(page, old);
  const n = calls().length;
  const r = fold(["kit"]);
  assert.equal(r.status, 0, r.stderr);
  const out = fs.readFileSync(page, "utf8");
  assert.deepEqual(out.match(span), [styles, script], "the starter's styles and script, each once");
  assert.match(out, /<script>\n\/\* switcher: start \*\/[\s\S]*?\/\* switcher: end \*\/\n<\/script>\n<\/body>/, "the script in a <script> of its own, before </body>");
  assert.match(out, /<body>\n<nav data-ss-canvas="pin" class="switcher no-print" aria-label="Design views" data-ss-react="off">\n  <div class="switcher-views" role="group" aria-label="Device views"><\/div>\n<\/nav>/);
  assert.doesNotMatch(out, /@media \(max-width: 40rem\)|5vw/);
  // The script runs without tabs, and the nav that holds only the device row shows only with buttons.
  assert.doesNotMatch(script, /if \(!tabsNow\(\)\) return;/);
  assert.match(styles, /\.switcher:has\(> \.switcher-views:only-child:empty\)/);
  assert.match(fold(["kit"]).stdout, /^kit: already current$/m);
  assert.equal(calls().length, n, "kit pushes nothing");
});

// A round's sections, lines and token rules, read back from the page.
const sectionsOf = (page) => [...page.matchAll(/^<section class="direction"[^>]*>[\s\S]*?^<\/section>/gm)].map((m) => m[0]);
const attr = (html, name) => (html.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];

test("round puts each version in a row of its own below everything, joined to its parent by a line, with its tokens, and changes nothing earlier", () => {
  const { folder, fold, sent } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const file = path.join(folder, "work", "index.html"), before = fs.readFileSync(file, "utf8"), pushes = sent().length;
  const r = fold(["round", "second", "Bolder", "Quieter", "Wider"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^round: Bolder, Quieter and Wider under Second, in a new row joined to it by lines \(bolder, quieter, wider\), each with its tokens; the canvas shows every direction; nothing pushed$/m);
  const page = fs.readFileSync(file, "utf8"), all = sectionsOf(page);
  assert.deepEqual(all.slice(0, 3), sectionsOf(before), "the first round's sections are as they were");
  const versions = all.slice(3);
  assert.deepEqual(versions.map((s) => [attr(s, "data-ss-id"), attr(s, "data-version-of"), attr(s, "data-ss-frame"), attr(s, "data-ss-label"), attr(s, "data-ss-x"), attr(s, "data-ss-y")]), [
    ["direction-bolder", "second", "desktop", "Bolder", "0", "1120"],
    ["direction-quieter", "second", "desktop", "Quieter", "1352", "1120"],
    ["direction-wider", "second", "desktop", "Wider", "2704", "1120"],
  ], "a row under the first, 320 px below its bottom, centred under Second");
  for (const v of ["bolder", "quieter", "wider"]) {
    const s = versions.find((x) => attr(x, "data-ss-id") === `direction-${v}`);
    assert.match(s, new RegExp(`data-ss-say="Use ${v[0].toUpperCase()}${v.slice(1)}"[^>]*><span class="use">Use this design</span>`), `${v} has its pill`);
    assert.match(s, new RegExp(`<!-- part:${v} --><div class="drawing" data-ss-id="${v}-drawing">[\\s\\S]*<!-- /part:${v} -->`), `${v} has its empty part`);
    assert.ok(page.includes(`  [data-ss-id="direction-${v}"] { --brand-ink: #f2efe8; --brand-ground: #15171c; --brand-accent: #ffb703; --font-display: "Avenir Next", Futura, "Gill Sans", sans-serif; --font-body: "Avenir Next", "Segoe UI", sans-serif; }\n`), `${v} starts from Second's tokens`);
  }
  const lines = page.match(/<div class="no-print" data-round-lines data-ss-id="round-lines" aria-hidden="true" data-ss-x="([-\d.]+)" data-ss-y="([-\d.]+)" style="width:([\d.]+)px!important;height:([\d.]+)px!important"><svg[^>]*>((?:<path d="[^"]*"\/>)*)<\/svg><\/div>/);
  assert.ok(lines, "one lines block");
  assert.deepEqual(lines.slice(1, 5), ["638", "800", "2708", "320"], "from Second's bottom to the versions' tops");
  assert.deepEqual([...lines[5].matchAll(/d="([^"]*)"/g)].map((m) => m[1]), [
    "M2 320V112Q2 96 18 96H1338Q1354 96 1354 80V0", "M1354 320V0", "M2706 320V112Q2706 96 2690 96H1370Q1354 96 1354 80V0",
  ], "each line from its version's top middle up, across 96 px under Second, and up to Second's bottom middle");
  assert.ok(sectionsOf(page.slice(page.indexOf(lines[0]))).length === 0, "the lines come after the last direction");
  assert.equal(page.match(/\/\* rounds: start \*\//g).length, 1, "the lines' rules once");
  assert.match(page, /<meta name="ss-canvas-focus" content="all">/);
  assert.equal(sent().length, pushes, "nothing pushed");
  // A round from a version: a row below that one, and every line drawn again in the one block.
  assert.equal(fold(["round", "bolder", "Bolder Still", "Plain"]).status, 0);
  const again = fs.readFileSync(file, "utf8"), next = sectionsOf(again);
  assert.deepEqual(next.slice(0, 6), all, "the first two rounds are as they were");
  assert.deepEqual(next.slice(6).map((s) => [attr(s, "data-version-of"), attr(s, "data-ss-x"), attr(s, "data-ss-y")]), [["bolder", "-676", "2240"], ["bolder", "676", "2240"]]);
  assert.deepEqual(next.map((s) => attr(s, "data-round") || null), [null, null, null, "2", "2", "2", "3", "3"], "the directions are round 1, and each round takes the next number");
  assert.equal(again.match(/<div class="no-print" data-round-lines data-ss-id="round-lines" /g).length, 1);
  assert.equal(again.match(/<path /g).length, 5);
});

test("the starter carries the lines' rules as round adds them to an older page, shown only on the canvas", () => {
  const css = fs.readFileSync(FOLD, "utf8").match(/const ROUNDS_CSS = `([\s\S]*?)`;/)[1];
  assert.ok(BASE.includes(css), "base.html's rounds span is fold.js's");
  assert.match(css, /html:not\(:has\(meta\[name="ss-canvas"\]\[content="on"\]\)\) \[data-round-lines\] \{ display: none; \}/);
  const { folder, fold } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  // An older starter: no lines' rules, and a switcher script that knows nothing of rounds.
  const file = path.join(folder, "work", "index.html");
  const old = BASE.replace(`${css}\n`, "").replace(/  \/\* on a phone, once a page has rounds[\s\S]*?\n  \}\n/, "")
    .replace(/(<script>[\s\S]*?\/\* switcher: start \*\/)[\s\S]*?(\/\* switcher: end \*\/)/, "$1\n(() => {})();\n$2");
  assert.ok(!old.includes("function newest()") && !old.includes("[data-older]"), "the older starter's tabs know nothing of rounds");
  fs.writeFileSync(file, old);
  assert.equal(fold(["round", "first", "Lighter"]).status, 0);
  const page = fs.readFileSync(file, "utf8");
  assert.equal(page.match(/\/\* rounds: start \*\//g).length, 1);
  assert.ok(page.indexOf(css) < page.indexOf("</style>"), "in the page's first <style>");
  assert.ok(page.includes("function newest()") && page.includes(".switcher-tabs button[data-older] { display: none; }"), "round brings in the starter's switcher, so the phone tabs follow the rounds");
  assert.match(fold(["kit"]).stdout, /^kit: already current$/m);
});

test("round replaces only its own lines block, never an element of the page's whose class or id starts the same, and gives the block an id no other element has", () => {
  const { folder, fold } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const file = path.join(folder, "work", "index.html");
  const note = '<div class="rounds-summary" data-ss-id="first-rounds-summary"><p>Keep this note</p></div>';
  const mine = '<div class="rounds" data-ss-id="rounds"><p>Round one</p></div><p data-ss-id="round-lines">Lines</p>';
  const page = fs.readFileSync(file, "utf8").replace("<!-- /part:first -->", () => `${note}${mine}<!-- /part:first -->`);
  fs.writeFileSync(file, page);
  for (const [args, n] of [[["round", "first", "Bolder"], 1], [["round", "bolder", "Plain"], 2]]) {
    assert.equal(fold(args).status, 0, args.join(" "));
    const out = fs.readFileSync(file, "utf8"), tags = out.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi, "");
    const ids = [...tags.matchAll(/<[a-z][^>]*\sdata-ss-id="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(out.includes(`${note}${mine}<!-- /part:first -->`), `the first direction's own elements stay, after round ${n + 1}`);
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], "no id twice");
    assert.equal(out.match(/ data-round-lines /g).length, 1, "one lines block");
    assert.match(out, /<div class="no-print" data-round-lines data-ss-id="round-lines-2" /, "an id of its own, the same each time it is drawn");
    assert.equal(out.match(/<path /g).length, n);
  }
});

test("round puts versions before a page's device views, so the views keep the numbers after the directions, and its row below them, in the writer's frame too", () => {
  const { folder, fold } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const file = path.join(folder, "work", "index.html"), view = '<section class="direction" data-view-of="first" data-ss-frame="phone" data-ss-section data-ss-id="direction-first-phone" data-ss-thing="direction/first/phone" data-ss-label="First · Phone" data-ss-x="0" data-ss-y="896">\n  <p data-ss-id="first-phone-note">Phone</p>\n</section>\n';
  const withView = BASE.replace("\n<script>\n/* Nothing in a script", () => `\n${view}\n<script>\n/* Nothing in a script`);
  fs.writeFileSync(file, withView);
  fs.writeFileSync(path.join(folder, "draw", "frame.html"), withView);
  assert.equal(fold(["round", "first", "Calmer", "Louder"]).status, 0);
  const all = sectionsOf(fs.readFileSync(file, "utf8"));
  assert.equal(fs.readFileSync(path.join(folder, "draw", "frame.html"), "utf8"), fs.readFileSync(file, "utf8"), "the writer's frame gets the same round");
  assert.deepEqual(all.map((s) => attr(s, "data-ss-id")), ["direction-first", "direction-second", "direction-third", "direction-calmer", "direction-louder", "direction-first-phone"]);
  assert.deepEqual(all.slice(3, 5).map((s) => attr(s, "data-ss-y")), ["2060", "2060"], "below the phone view's bottom (896 + 844), 320 px down");
});

test("round refuses a parent the page hasn't got, a name already taken or one of fold.js's own files, more than five, and a direction with no place, and changes nothing", () => {
  const { folder, fold } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const file = path.join(folder, "work", "index.html"), before = fs.readFileSync(file, "utf8");
  const cases = [
    [["round", "night-watch", "Bolder"], /round: give the slug of the direction the versions come from \(first, second, third\)/],
    [["round", "first", "Second"], /round: a direction is already called second: give "Second" another name/],
    [["round", "first", "Card"], /round: draw\/card is one of fold.js's own files: give "Card" another name/],
    [["round", "first", "A", "B", "C", "D", "E", "F"], /round: give the direction the versions come from, then each version's name, 1 to 5 of them/],
    [["round", "first"], /1 to 5 of them/],
  ];
  fs.writeFileSync(path.join(folder, "draw", "card"), "down\n");
  for (const [args, said] of cases) { const r = fold(args); assert.equal(r.status, 2, args.join(" ")); assert.match(r.stderr, said); }
  fs.writeFileSync(file, before.replace(' data-ss-x="1352" data-ss-y="0"', ""));
  const r = fold(["round", "first", "Bolder"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /round: second has no data-ss-frame size or no data-ss-x and data-ss-y/);
  assert.equal(fs.readFileSync(file, "utf8"), before.replace(' data-ss-x="1352" data-ss-y="0"', ""), "nothing changed");
});
