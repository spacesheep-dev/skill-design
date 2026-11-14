#!/usr/bin/env node
// Every command the Design skill runs, so a person allows this one script (and check.js, which only
// reads) instead of a dozen shell commands. It works in one folder (the one holding work/ and draw/)
// and on one space: `start` stores its id in draw/space, and nothing here takes another. It runs only
// the spacesheep CLI, with fixed arguments (never a string it was given as a shell command), and says
// each thing it does: here, in draw/fold.log (the writer) and in draw/save.log (a save).
//
//   node fold.js -C <folder> start <link>        a status on the space, its source read into work/ (the
//                                               starter instead, if it holds no design), its id kept
//   node fold.js -C <folder> start --new "<title>"   the starter in work/, saved as a new space
//   node fold.js -C <folder> push                push work/index.html to the space once
//   node fold.js -C <folder> write               start the page's only writer in the background (below)
//   node fold.js -C <folder> brief               wait for draw/BRIEF.md to end with `end brief`, print it
//   node fold.js -C <folder> save "<message>" "<status>" [pictures]
//                                               in the background: save a version, push the page again,
//                                               put the status back, and with `pictures` take one of each
//                                               direction to <slug>.png (two tries each); log in draw/save.log
//   node fold.js -C <folder> wait                wait for that save to end (at most 100 s), print its log
//   node fold.js -C <folder> stop "<message>"    let the last edits fold, stop the writer, save a version
//   node fold.js -C <folder> read                read the space's current source into work/ again
//
// The writer folds each direction's parts, draw/<slug>/<NN>.html (each written whole with an agent's
// Write tool, its first line `<!-- status: Night Watch: prices -->`), in name order, into
// draw/frame.html between `<!-- part:<slug> -->` and `<!-- /part:<slug> -->`, writes work/index.html,
// and pushes the page and the status whenever they change. A file changed in the last 300 ms waits for
// the next pass, so a part is never folded half-written. A direction keeps its placeholder below its
// parts until they show 40 characters of text, so a first part of styles alone never blanks it.
// (Older pages: draw/<slug>.html ending with `<!-- end <slug> -->`, its status in draw/<slug>.status.)
// It stops on `stop`, or after 30 minutes.
const fs = require("fs");
const path = require("path");
const { execFileSync, execFile, execSync, spawn } = require("child_process");

const argv = process.argv.slice(2);
if (argv[0] === "-C") {
  try { process.chdir(argv[1]); } catch { console.error(`fold.js: no folder ${argv[1]}`); process.exit(2); }
  argv.splice(0, 2);
}
const cmd = argv[0];
const COMMANDS = ["start", "push", "write", "brief", "save", "wait", "stop", "read"];
if (!COMMANDS.includes(cmd)) {
  console.error(`usage: node fold.js -C <folder> ${COMMANDS.join("|")} …  (the header of ${__filename} says what each does)`);
  process.exit(2);
}
const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } };
// What it passes to the CLI: a space id is a UUID, and no link, message or status starts with "-",
// so none can be read as one of the CLI's own flags.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const plain = (what, v) => { if (typeof v === "string" && v.startsWith("-")) { console.error(`fold.js: a ${what} can't start with "-"`); process.exit(2); } return v; };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
fs.mkdirSync("draw", { recursive: true });
const log = (line) => fs.appendFileSync("draw/fold.log", `${new Date().toISOString()} ${line}\n`);
// Write whole files only (a temporary copy in draw/, then a rename), so no reader sees half of one.
const swap = (f, text) => { const t = `draw/.${f.replace(/\//g, "_")}.tmp`; fs.writeFileSync(t, text); fs.renameSync(t, f); };
const bg = process.env.FOLD_BG === "1";
// Run this same command again, detached, its output to a log: the writer and the save run on their own.
function background(out) {
  const fd = fs.openSync(out, "a");
  const child = spawn(process.execPath, [__filename, ...argv], { detached: true, stdio: ["ignore", fd, fd], env: { ...process.env, FOLD_BG: "1" } });
  child.unref();
  return child.pid;
}

// The CLI: one on the PATH, else npx's copy found once (a push then takes about 0.5 s, not 3).
let cli = ["npx", "-y", "spacesheep@latest"];
for (const find of ["command -v spacesheep", "npx -y -p spacesheep@latest -c 'command -v spacesheep'"]) {
  try {
    const bin = execSync(find, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (bin) { cli = [bin]; break; }
  } catch {}
}
const run = (args, opts = {}) => execFileSync(cli[0], [...cli.slice(1), ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 60000, ...opts });
const runAsync = (args) => new Promise((ok) => execFile(cli[0], [...cli.slice(1), ...args], { timeout: 90000 }, (e, out, err) => ok({ e, out: String(out || "") + String(err || "") })));
const why = (e) => String(e.stderr || e.message).trim().split("\n").slice(-3).join(" ").slice(0, 300);

// The one space: from start on, its id is in draw/space.
let space = (read("draw/space") || "").trim();
if (cmd !== "start" && !UUID.test(space)) { console.error(`${cmd}: no space yet (draw/space holds no id); run start first, in this folder`); process.exit(2); }

// The page goes through stdin, as JSON to the push_live tool: no argument limit (Linux refuses one over 128 KB).
function push(flag, value) {
  const html = flag === "--html";
  try {
    run(html ? ["call", "push_live", "-"] : ["live", "push", "--space", space, flag, value],
      { input: html ? JSON.stringify({ space, html: value }) : "", stdio: ["pipe", "ignore", "pipe"], timeout: 20000 });
    log(html ? `pushed the page (${value.length} bytes)` : `pushed the status: ${value}`);
    return true;
  } catch (e) {
    log(`${html ? "page" : "status"} push refused: ${why(e)}`);
    return false;
  }
}
const isDesign = (h) => /<section\b[^>]*class="[^"]*\bdirection\b|data-ss-id="[a-z0-9-]+"/.test(h || "");

if (cmd === "start") {
  if (argv[1] === "--new") {
    fs.mkdirSync("work", { recursive: true });
    fs.copyFileSync(path.join(__dirname, "base.html"), "work/index.html");
    const out = run(["deploy", "work", "--title", plain("title", argv[2]) || "Design", "--json"]);
    const j = JSON.parse(out.slice(out.indexOf("{")));
    space = (j.space || {}).id;
    if (!UUID.test(space || "")) { console.error("start: the new space's id isn't in the answer"); process.exit(1); }
    fs.writeFileSync("draw/space", space);
    console.log(`made a new space from the starter: ${(j.space || {}).url || space}\nspace: ${space}`);
    process.exit(0);
  }
  const link = plain("link", argv[1]);
  if (!link) { console.error("start: give the space's link, or --new \"<title>\""); process.exit(2); }
  try { run(["live", "push", "--space", link, "--status", "Reading your brief"]); console.log("status: Reading your brief"); }
  catch (e) { console.error(`status refused: ${why(e)}`); }
  space = ((run(["spaces", "get", link]).match(/^ *id: (.*)$/m) || [])[1] || "").trim();
  if (!UUID.test(space)) { console.error(`start: no id in the answer to spaces get ${link}`); process.exit(1); }
  fs.writeFileSync("draw/space", space);
  process.stdout.write(run(["read", space, "-o", "work"]));
  if (!isDesign(read("work/index.html"))) {
    fs.copyFileSync(path.join(__dirname, "base.html"), "work/index.html");
    console.log("work/index.html held no design: the starter is in its place");
  }
  console.log(`space: ${space}`);
  process.exit(0);
}
if (cmd === "read") {
  process.stdout.write(run(["read", space, "-o", "work"]));
  process.exit(0);
}
if (cmd === "push") {
  const ok = push("--html", fs.readFileSync("work/index.html", "utf8"));
  console.log(ok ? `pushed the page (${fs.statSync("work/index.html").size} bytes)` : "push refused: see draw/fold.log");
  process.exit(ok ? 0 : 1);
}
if (cmd === "brief") {
  const until = Date.now() + 100000;
  let b;
  while (!/end brief/.test((b = read("draw/BRIEF.md")) || "") && Date.now() < until) sleep(1000);
  console.log(/end brief/.test(b || "") ? b : "no brief yet: run brief again");
  process.exit(0);
}
if (cmd === "save" || cmd === "stop") { plain("message", argv[1]); plain("status", argv[2]); }
if (cmd === "save" && !bg) {
  if (!argv[1]) { console.error('save: give a message, e.g. save "Three directions" "All three are up"'); process.exit(2); }
  fs.writeFileSync("draw/save.log", "");
  const pid = background("draw/save.log");
  console.log(`saving in the background (pid ${pid}): "${argv[1]}"${argv[3] === "pictures" ? ", then pictures" : ""}; fold.js wait shows how it ended`);
  process.exit(0);
}
if (cmd === "save") {
  (async () => {
    const say = (l) => console.log(`${new Date().toISOString().slice(11, 19)} ${l}`);
    try {
      say(run(["deploy", "work", "--space", space, "-m", argv[1]]).trim().split("\n").filter((l) => /version|Updated|v\d/i.test(l)).join(" ") || "saved");
    } catch (e) { say(`save failed: ${why(e)}`); return; }
    say(push("--html", fs.readFileSync("work/index.html", "utf8")) ? "pushed the page again" : "page push refused (draw/fold.log)");
    if (argv[2]) say(push("--status", argv[2]) ? `status: ${argv[2]}` : "status push refused (draw/fold.log)");
    if (argv[3] !== "pictures") { say("save done"); return; }
    const slugs = [...(read("work/index.html") || "").matchAll(/data-ss-id="direction-([a-z0-9-]+)"/g)].map((m) => m[1]);
    const shots = await Promise.all([...new Set(slugs)].map(async (d) => {
      for (let t = 1; t <= 2; t++) {
        const r = await runAsync(["spaces", "screenshot", space, "--width", "1920", "--height", "1080", "--section", `direction-${d}`, "-o", `${d}.png`]);
        if (!r.e) { say(`picture: ${d}.png`); return true; }
        say(`picture of ${d} refused (try ${t}): ${r.out.trim().split("\n").slice(-1)[0].slice(0, 200)}`);
        await new Promise((ok) => setTimeout(ok, 5000));
      }
      return false;
    }));
    say(shots.every(Boolean) ? "pictures done" : `pictures done, ${shots.filter((x) => !x).length} missing`);
  })();
  return;
}
if (cmd === "wait") {
  const until = Date.now() + 100000;
  if (read("draw/save.log") === null) { console.log("no save has run"); process.exit(0); }
  const ended = () => /save done|pictures done|save failed/.test(read("draw/save.log") || "");
  while (!ended() && Date.now() < until) sleep(1000);
  process.stdout.write(read("draw/save.log"));
  if (!ended()) console.log("still saving: run wait again");
  process.exit(0);
}
if (cmd === "write" && !bg) {
  fs.copyFileSync("work/index.html", "draw/frame.html");
  fs.rmSync("draw/stop", { force: true });
  const pid = background("draw/fold.out");
  fs.writeFileSync("draw/writer.pid", String(pid));
  console.log(`the writer is running (pid ${pid}): it folds draw/<slug>/*.html into draw/frame.html and pushes; log in draw/fold.log`);
  process.exit(0);
}
if (cmd === "stop") {
  sleep(3000); // the last edits fold within 2 s
  fs.writeFileSync("draw/stop", "");
  const pid = +(read("draw/writer.pid") || 0);
  const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
  for (let i = 0; pid && alive() && i < 50; i++) sleep(200);
  const pushes = ((read("draw/fold.log") || "").match(/pushed the page/g) || []).length;
  console.log(`the writer stopped (${pushes} page pushes in draw/fold.log)`);
  if (!argv[1]) process.exit(0);
  try { console.log(run(["deploy", "work", "--space", space, "-m", argv[1]]).trim()); }
  catch (e) { console.error(`save failed: ${why(e)}`); process.exit(1); }
  process.exit(0);
}

const good = {};
// Text a person would see: no styles, scripts, templates, comments or tags.
const shownChars = (h) => h.replace(/<(style|script|template)\b[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<[^>]*>/g, " ").replace(/&[#\w]+;/g, "x").replace(/\s+/g, " ").trim().length;
function fold() {
  const frame = read("draw/frame.html");
  if (!frame) return null;
  const statuses = [];
  const html = frame.replace(/<!-- part:([a-z0-9-]+) -->([\s\S]*?)<!-- \/part:\1 -->/g, (m, slug, inner) => {
    const dir = `draw/${slug}`;
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".html")).sort() : [];
    let status = "";
    if (files.length) {
      const fresh = files.some((f) => Date.now() - fs.statSync(`${dir}/${f}`).mtimeMs < 300);
      const parts = files.map((f) => read(`${dir}/${f}`) || "");
      if (!fresh) good[slug] = parts.join("\n");
      status = ((parts[parts.length - 1].match(/^\s*<!-- status: (.*?) -->/) || [])[1] || "").trim();
    } else {
      const part = read(`draw/${slug}.html`);
      if (part && part.trimEnd().endsWith(`<!-- end ${slug} -->`)) good[slug] = part;
      status = (read(`draw/${slug}.status`) || "").trim().split("\n")[0];
    }
    if (status) statuses.push(status);
    const g = good[slug];
    return `<!-- part:${slug} -->${g === undefined ? inner : shownChars(g) >= 40 ? g : g + inner}<!-- /part:${slug} -->`;
  });
  return { html, status: statuses.join(" · ").slice(0, 200) };
}

let shown = "", said = "";
const until = Date.now() + 30 * 60 * 1000;
while (!fs.existsSync("draw/stop") && Date.now() < until) {
  const page = fold();
  const again = fs.existsSync("draw/pushnow");
  if (page && (page.html !== shown || again)) {
    swap("work/index.html", page.html);
    if (push("--html", page.html)) {
      shown = page.html;
      if (again) fs.rmSync("draw/pushnow", { force: true });
    }
  }
  if (page && page.status && page.status !== said && push("--status", page.status)) said = page.status;
  sleep(1000);
}
