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
if (a[0] === "spaces" && a[1] === "get") { console.log("title: Untitled\\n  id: ${SPACE}"); process.exit(0); }
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
  assert.equal(fs.readFileSync(path.join(folder, "work", "index.html"), "utf8"), BASE);
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
  assert.equal(fold(["write"]).status, 0);
  const s = fold(["stop"]);
  assert.equal(s.status, 0, s.stdout + s.stderr);
  const log = calls();
  const status = log.findIndex((a) => a[0] === "live" && a.includes("Lift: the dates"));
  const page = log.findIndex((a, i) => i > log.findIndex((b) => b[0] === "live" && b.includes("Reading your brief")) && a[0] === "call" && a[1] === "push_live");
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
  // Only the first placeholder changes: its marker, its id and its heading. The one in "second" keeps its names.
  const expected = edited.replace('<!-- part:first --><div class="drawing" data-ss-id="first-drawing"><h2>First</h2>', '<!-- part:night-watch --><div class="drawing" data-ss-id="night-watch-drawing"><h2>Night &amp; Watch</h2>').replace("<!-- /part:first -->", "<!-- /part:night-watch -->");
  assert.notEqual(expected, edited);
  assert.equal(named, expected);
  assert.equal(sent().at(-1).html, named, "the named page is the one pushed");
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
    assert.equal(work, BASE, `${name}: the starter is in work/`);
    assert.ok(starter, `${name}: draw/starter is written`);
    assert.match(r.stdout, /held no design: the starter is in its place\nnext: /, name);
  }
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
  assert.equal(fs.readFileSync(path.join(folder, "work", "index.html"), "utf8"), BASE);
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

test("a revision's first status goes up before anything is read: read's words (Reading your design unless given), and start's when given", () => {
  const { root, folder, fold, calls } = setup();
  const design = BASE.replace("<title>", "<title>Street party · ");
  fs.writeFileSync(path.join(root, "page.html"), design);
  const env = { FAKE_PAGE: path.join(root, "page.html") };
  const r = fold(["start", "https://stage.test/s", "Making Big Day's 18 red"], env);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^status: Making Big Day's 18 red$/m);
  let log = calls();
  const said = log.findIndex((a) => a[0] === "live" && a.includes("Making Big Day's 18 red"));
  assert.ok(said >= 0 && said < log.findIndex((a) => a[0] === "read"), "start's status came before its read");
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
