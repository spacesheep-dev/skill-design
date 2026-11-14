#!/usr/bin/env node
// Every command the Design skill runs, so a person allows this one script (and check.js, which only
// reads) instead of a dozen shell commands. It works in one folder (the one holding work/ and draw/)
// and on one space: `start` stores its id in draw/space, and nothing here takes another. It runs only
// the spacesheep CLI, with fixed arguments (never a string it was given as a shell command); if the
// CLI isn't installed, npx downloads it from npm. It reads and writes only inside the folder, never
// through a link, and says each thing it does: here, in draw/fold.log (the writer) and in
// draw/save.log (a save).
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
//   node fold.js -C <folder> stop "<message>"    ask the writer to stop and wait for its own word that it
//                                               has (else fail), fold the last edits, push them and save
//   node fold.js -C <folder> read                read the space's current source into work/ again
//
// The writer folds each direction's parts, draw/<slug>/<NN>.html (each written whole with an agent's
// Write tool, its first line `<!-- status: Night Watch: prices -->`), in name order, into
// draw/frame.html between `<!-- part:<slug> -->` and `<!-- /part:<slug> -->`, writes work/index.html,
// and pushes the page and the status whenever they change. A file changed in the last 300 ms waits for
// the next pass, so a part is never folded half-written. A direction keeps its placeholder below its
// parts until they show 40 characters of text, so a first part of styles alone never blanks it.
// (Older pages: draw/<slug>.html ending with `<!-- end <slug> -->`, its status in draw/<slug>.status.)
// It stops on `stop`, after 5 minutes with no change to any part or the frame (so a session that
// closes leaves it running at most 5 minutes), or after 30 minutes; `write` starts it again.
const fs = require("fs");
const path = require("path");
const { execFileSync, execFile, execSync, spawn, spawnSync } = require("child_process");

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

// The folder, and nothing outside it: a path is used only if it resolves inside the folder and no part
// of it below the folder is a link (lstat, so a link is seen as a link, never followed).
const ROOT = fs.realpathSync(".");
function within(p) {
  const abs = path.resolve(ROOT, p);
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return false;
  let at = ROOT;
  for (const step of path.relative(ROOT, abs).split(path.sep).filter(Boolean)) {
    at = path.join(at, step);
    let st;
    try { st = fs.lstatSync(at); } catch { return true; } // not there yet: it will be made inside
    if (st.isSymbolicLink()) return false;
  }
  return true;
}
const refused = new Set();
function refuse(p) {
  if (refused.has(p)) return null;
  refused.add(p);
  const line = `refused ${p}: it is a link or outside ${ROOT}`;
  console.error(`fold.js: ${line}`);
  if (p !== "draw/fold.log" && within("draw/fold.log")) fs.appendFileSync("draw/fold.log", `${new Date().toISOString()} ${line}\n`);
  return null;
}
const read = (f) => { if (!within(f)) return refuse(f); try { return fs.readFileSync(f, "utf8"); } catch { return null; } };
const write = (f, text) => { if (!within(f)) return refuse(f); fs.writeFileSync(f, text); return true; };
const here = (f) => within(f) && fs.existsSync(f);
const isLink = (f) => { try { return fs.lstatSync(path.resolve(ROOT, f)).isSymbolicLink(); } catch { return false; } };
const remove = (f) => { if (within(f)) fs.rmSync(f, { force: true }); };
const mkdir = (d) => { if (!within(d)) { refuse(d); process.exit(2); } fs.mkdirSync(d, { recursive: true }); };
// The files in a folder of parts, links left out.
function files(d) {
  if (!within(d)) { if (fs.existsSync(path.resolve(ROOT, d)) || isLink(d)) refuse(d); return []; }
  if (!fs.existsSync(d) || !fs.lstatSync(d).isDirectory()) return [];
  const all = fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.name.endsWith(".html"));
  for (const e of all) if (!e.isFile()) refuse(`${d}/${e.name}`);
  return all.filter((e) => e.isFile()).map((e) => e.name).sort();
}
// Links anywhere under a folder the CLI will upload or write into.
function links(d) {
  const out = [];
  const walk = (x) => { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, e.name); if (e.isSymbolicLink()) out.push(p); else if (e.isDirectory()) walk(p); } };
  if (!within(d)) return [d];
  if (fs.existsSync(d)) walk(d);
  return out;
}
const work = () => { const l = links("work"); if (l.length) { console.error(`fold.js: refused: work/ holds a link (${l.slice(0, 3).join(", ")}), so a save could carry a file from outside`); return false; } return true; };

// What it passes to the CLI: a space id is a UUID, and no link, message or status starts with "-",
// so none can be read as one of the CLI's own flags.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const plain = (what, v) => { if (typeof v === "string" && v.startsWith("-")) { console.error(`fold.js: a ${what} can't start with "-"`); process.exit(2); } return v; };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
mkdir("draw");
const NEW = fs.readdirSync("draw").length === 0; // a folder fold.js hasn't used yet
const log = (line) => { if (within("draw/fold.log")) fs.appendFileSync("draw/fold.log", `${new Date().toISOString()} ${line}\n`); else refuse("draw/fold.log"); };
// Write whole files only (a temporary copy in draw/, then a rename), so no reader sees half of one.
const swap = (f, text) => { const t = `draw/.${f.replace(/\//g, "_")}.tmp`; if (!within(t) || !within(f)) return refuse(f); fs.writeFileSync(t, text); fs.renameSync(t, f); return true; };
// A background job (the writer, a save) is one run, and its record is draw/<job>.run:
// "<id> <deadline> <group>": a fresh id, the time (ms) by which the run makes its last call to the CLI,
// and its process group. The run is started detached, so it leads a process group of its own, and
// every CLI call it makes (npx and whatever npx starts too) is in that group: while any of them is
// there, the group is. A folder's first `start` writes "none" as the record (no run yet); after that a
// record is only ever replaced by the next run's, never removed. The run writes draw/<job>.done
// ("<id> <how it ended>") as its last act, after its last CLI call has returned. So a job is:
//   none     no run was ever started here
//   done     the run on record said how it ended, and its process group is gone
//   lapsed   it never said, but its deadline has passed and its process group is gone
//   open     anything else: it hasn't said, or something it started is still there, or that can't be told
//   unknown  the record is missing, unreadable, malformed or a link: nothing about it can be told
// `write` and `save` start a run only after none, done or lapsed; `wait` and `stop` succeed only on done
// (or none). Unknown stays unknown: no command replaces it or reads it as "none". draw/<job>.pid is there
// for a person to look the process up; nothing here decides on it.
const LIFE = { writer: 31 * 60 * 1000, save: 10 * 60 * 1000 };
const RUNID = /^[0-9a-f]{16}$/;
// Whether any process of a group is there: true, false, or null when there's no group to ask about.
function there(group) {
  if (!(group > 1)) return null;
  try { process.kill(-group, 0); return true; } catch (e) { return e.code !== "ESRCH"; }
}
function job(name) {
  const f = `draw/${name}.run`, d = `draw/${name}.done`;
  if (!within(f) || !within(d)) return { state: "unknown", why: `draw/${name}.run or .done is a link` };
  const t = read(f);
  if (t === null) return { state: "unknown", why: `draw/${name}.run is ${fs.existsSync(f) ? "unreadable" : "missing"}` };
  if (t.trim() === "none") return { state: "none" };
  const m = t.trim().match(/^([0-9a-f]{16}) (\d{13}) (\d+|-)$/);
  if (!m) return { state: "unknown", why: `draw/${name}.run doesn't hold a run` };
  const id = m[1], deadline = +m[2], group = m[3] === "-" ? 0 : +m[3], done = (read(d) || "").trim();
  const said = done.startsWith(id + " "), alive = there(group);
  const how = said ? done.slice(id.length + 1) : undefined;
  if (alive === false && said) return { state: "done", id, deadline, how };
  if (alive === false && Date.now() > deadline + 5000) return { state: "lapsed", id, deadline };
  const why = alive === null ? `its processes can't be checked (no process group on record)`
    : alive ? (said ? `it said it ended (${how}), but a process it started is still there (process group ${group})` : `it hasn't said it ended, and its process group ${group} is still there`)
    : `it hasn't said it ended, and its time isn't up until ${at(deadline)}`;
  return { state: "open", id, deadline, how, why };
}
function settle(name, ms) {
  const until = Date.now() + ms;
  let j = job(name);
  while (j.state === "open" && Date.now() < until) { sleep(200); j = job(name); }
  return j;
}
const at = (ms) => `${new Date(ms).toISOString().slice(11, 19)} UTC`;
const LOOK = (what) => `look for "fold.js ${what}" among the processes (ps -ef)`;
// Before `write` or `save` starts a run: never over an unknown one; an open one is the caller's to answer.
function launchable(name, what) {
  const j = job(name);
  if (j.state === "unknown") { console.error(`${cmd}: ${j.why}, so fold.js can't tell whether a ${name} is still running here; it may be. Nothing started; ${LOOK(what)}`); process.exit(2); }
  if (j.state === "lapsed") console.log(`the last ${name} (run ${j.id}) never said how it ended; its time ran out at ${at(j.deadline)} and none of its processes is left`);
  return j;
}
// Start a run: its record first (no group yet, so nothing can count it as ended), then the job, detached,
// then the record again with the job's process group. The job finds its id and deadline in the record.
function begin(name, out, first) {
  const id = require("crypto").randomBytes(8).toString("hex"), deadline = Date.now() + LIFE[name];
  remove(`draw/${name}.done`);
  if (!swap(`draw/${name}.run`, `${id} ${deadline} -\n`)) process.exit(2);
  if (first && !write(out, first(id))) process.exit(2);
  const pid = background(out, id);
  if (!swap(`draw/${name}.run`, `${id} ${deadline} ${pid}\n`)) process.exit(2);
  write(`draw/${name}.pid`, String(pid));
  return id;
}
// A log as text: "" when it doesn't exist yet, null when it can't be trusted (a link, outside).
const logText = (f) => (!within(f) ? null : fs.existsSync(f) ? read(f) : "");
const bg = process.env.FOLD_BG === "1";
const THIS_RUN = process.env.FOLD_RUN || "";
// Run this same command again, detached, as the given run, its output to a log.
function background(out, run) {
  if (!within(out)) { refuse(out); process.exit(2); }
  const fd = fs.openSync(out, "a");
  const child = spawn(process.execPath, [__filename, ...argv], { detached: true, stdio: ["ignore", fd, fd], env: { ...process.env, FOLD_BG: "1", FOLD_RUN: run } });
  child.unref();
  return child.pid;
}
// A run acknowledges only while it is still the run on record, so it never speaks for another.
let acked = false;
const ack = (name, how) => { if (acked || !RUNID.test(THIS_RUN) || job(name).id !== THIS_RUN) return; acked = true; swap(`draw/${name}.done`, `${THIS_RUN} ${how}\n`); };
// Inside a run, a call to the CLI may start only while this run is still the one on record, and must end
// before its deadline (its time limit is cut to fit); otherwise no call. Outside a run: the call's own limit.
const JOB = cmd === "write" ? "writer" : cmd;
let DEADLINE = Infinity, lost = "";
function allowed(ms) {
  if (!bg) return ms;
  if (job(JOB).id !== THIS_RUN) { lost = `its record (draw/${JOB}.run) was changed or removed`; return 0; }
  const left = DEADLINE - Date.now();
  if (left < 2000) { lost = `its time ran out (${at(DEADLINE)})`; return 0; }
  return Math.min(ms, left);
}

// The CLI: one on the PATH, else npx's copy (downloaded from npm the first time), found once, so a
// push then takes about 0.5 s, not 3. Each lookup has a time limit.
// At its time limit any call is killed outright (SIGKILL): a CLI that ignores a request to stop can't run on.
let cli = ["npx", "-y", "spacesheep@latest"];
for (const find of ["command -v spacesheep", "npx -y -p spacesheep@latest -c 'command -v spacesheep'"]) {
  try {
    const bin = execSync(find, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120000, killSignal: "SIGKILL" }).trim();
    if (bin) { cli = [bin]; break; }
  } catch {}
}
const run = (args, opts = {}) => execFileSync(cli[0], [...cli.slice(1), ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 60000, killSignal: "SIGKILL", ...opts });
const runAsync = (args) => new Promise((ok) => {
  const t = allowed(90000);
  if (!t) return ok({ e: new Error(lost), out: `not called: ${lost}` });
  execFile(cli[0], [...cli.slice(1), ...args], { timeout: t, killSignal: "SIGKILL" }, (e, out, err) => ok({ e, out: String(out || "") + String(err || "") }));
});
const why = (e) => String(e.stderr || e.message).trim().split("\n").slice(-3).join(" ").slice(0, 300);

// The one space: from start on, its id is in draw/space, checked as a UUID every time it's read.
let space = (read("draw/space") || "").trim();
if (cmd !== "start" && !UUID.test(space)) { console.error(`${cmd}: no space yet (draw/space holds no id); run start first, in this folder`); process.exit(2); }

// The page goes through stdin, as JSON to the push_live tool: no argument limit (Linux refuses one over 128 KB).
function push(flag, value) {
  const html = flag === "--html";
  const t = allowed(20000);
  if (!t) { log(`${html ? "page" : "status"} not pushed: ${lost}`); return false; }
  try {
    run(html ? ["call", "push_live", "-"] : ["live", "push", "--space", space, flag, value],
      { input: html ? JSON.stringify({ space, html: value }) : "", stdio: ["pipe", "ignore", "pipe"], timeout: t });
    log(html ? `pushed the page (${value.length} bytes)` : `pushed the status: ${value}`);
    return true;
  } catch (e) {
    log(`${html ? "page" : "status"} push refused: ${why(e)}`);
    return false;
  }
}
// A save, with everything the CLI says about it (its lines on stderr too: what landed, what merged).
function deploy(message) {
  if (!work()) return { ok: false, lines: ["work/ holds a link"] };
  const t = allowed(60000);
  if (!t) return { ok: false, lines: [`not called: ${lost}`] };
  const r = spawnSync(cli[0], [...cli.slice(1), "deploy", "work", "--space", space, "-m", message], { encoding: "utf8", timeout: t, killSignal: "SIGKILL" });
  const said = `${r.stdout || ""}\n${r.stderr || ""}`.split("\n").map((l) => l.trim()).filter(Boolean).filter((l) => !/^spacesheep /.test(l));
  return { ok: r.status === 0, lines: said.slice(0, 8) };
}
const isDesign = (h) => /<section\b[^>]*class="[^"]*\bdirection\b|data-ss-id="[a-z0-9-]+"/.test(h || "");
// One space per folder: start never points a folder at a second space.
function keep(id) {
  const had = (read("draw/space") || "").trim();
  if (had && had !== id) { console.error(`start: this folder is for space ${had}; use another folder for ${id}`); process.exit(2); }
  if (!write("draw/space", id)) process.exit(2);
}

const good = {};
// Text a person would see: no styles, scripts, templates, comments or tags.
const shownChars = (h) => h.replace(/<(style|script|template)\b[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<[^>]*>/g, " ").replace(/&[#\w]+;/g, "x").replace(/\s+/g, " ").trim().length;
function fold() {
  const frame = read("draw/frame.html");
  if (!frame) return null;
  const statuses = [];
  let waiting = false;
  const html = frame.replace(/<!-- part:([a-z0-9-]+) -->([\s\S]*?)<!-- \/part:\1 -->/g, (m, slug, inner) => {
    const dir = `draw/${slug}`;
    const names = files(dir);
    let status = "";
    if (names.length) {
      const fresh = names.some((f) => Date.now() - fs.lstatSync(`${dir}/${f}`).mtimeMs < 300);
      const parts = names.map((f) => read(`${dir}/${f}`) || "");
      if (!fresh) good[slug] = parts.join("\n"); else waiting = true;
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
  return { html, status: statuses.join(" · ").slice(0, 200), waiting };
}
// Fold once here, when no writer is running (after stop, or after its idle limit), so no edit is left out.
function foldOnce(what) {
  let page = fold();
  for (let i = 0; page && page.waiting && i < 10; i++) { sleep(400); page = fold(); } // a part still being written
  if (page && page.html !== read("work/index.html") && swap("work/index.html", page.html))
    return push("--html", page.html) ? `${what}: folded and pushed the last edits` : `${what}: folded the last edits; the push was refused (draw/fold.log)`;
  return "";
}
// Why the writer stopped, when it stopped by itself (no change for 5 minutes, refused pushes, 30 minutes).
function idle() {
  const j = job("writer");
  if (j.state !== "done" || j.how === "stop" || !here("draw/frame.html")) return "";
  return `the writer stopped: ${j.how}; \`fold.js write\` starts it again`;
}

if (cmd === "start") {
  // Only a folder's first start may say that no writer or save has run in it.
  if (NEW) for (const name of ["writer", "save"]) if (!swap(`draw/${name}.run`, "none\n")) process.exit(2);
  if (argv[1] === "--new") {
    if ((read("draw/space") || "").trim()) { console.error("start: this folder already has a space; use another folder for a new one"); process.exit(2); }
    mkdir("work");
    if (!work() || !swap("work/index.html", fs.readFileSync(path.join(__dirname, "base.html"), "utf8"))) process.exit(2);
    const out = run(["deploy", "work", "--title", plain("title", argv[2]) || "Design", "--json"]);
    const j = JSON.parse(out.slice(out.indexOf("{")));
    space = (j.space || {}).id;
    if (!UUID.test(space || "")) { console.error("start: the new space's id isn't in the answer"); process.exit(1); }
    keep(space);
    console.log(`made a new space from the starter: ${(j.space || {}).url || space}\nspace: ${space}`);
    process.exit(0);
  }
  const link = plain("link", argv[1]);
  if (!link) { console.error("start: give the space's link, or --new \"<title>\""); process.exit(2); }
  space = ((run(["spaces", "get", link]).match(/^ *id: (.*)$/m) || [])[1] || "").trim();
  if (!UUID.test(space)) { console.error(`start: no id in the answer to spaces get ${link}`); process.exit(1); }
  keep(space);
  try { run(["live", "push", "--space", space, "--status", "Reading your brief"]); console.log("status: Reading your brief"); }
  catch (e) { console.error(`status refused: ${why(e)}`); }
  if (!work()) process.exit(2);
  process.stdout.write(run(["read", space, "-o", "work"]));
  if (!isDesign(read("work/index.html"))) {
    if (!swap("work/index.html", fs.readFileSync(path.join(__dirname, "base.html"), "utf8"))) process.exit(2);
    console.log("work/index.html held no design: the starter is in its place");
  }
  console.log(`space: ${space}`);
  process.exit(0);
}
if (cmd === "read") {
  if (!work()) process.exit(2);
  process.stdout.write(run(["read", space, "-o", "work"]));
  process.exit(0);
}
if (cmd === "push") {
  const page = read("work/index.html");
  if (page === null) { console.error("push: no work/index.html"); process.exit(2); }
  const ok = push("--html", page);
  console.log(ok ? `pushed the page (${page.length} bytes)` : "push refused: see draw/fold.log");
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
  const j = launchable("save", "save");
  if (j.state === "open") { console.error(`save: the last save (run ${j.id}) may still be running: ${j.why}. Nothing started; fold.js wait shows when it ends`); process.exit(1); }
  if (!work()) process.exit(2);
  const run = begin("save", "draw/save.log", (id) => `save started (run ${id})\n`);
  console.log(`saving in the background (run ${run}): "${argv[1]}"${argv[3] === "pictures" ? ", then pictures" : ""}; fold.js wait shows how it ended`);
  const note = idle();
  if (note) console.log(note);
  process.exit(0);
}
if (cmd === "save") {
  const me = job("save");
  if (me.id !== THIS_RUN) process.exit(2); // not the save on record
  DEADLINE = me.deadline;
  write("draw/save.pid", String(process.pid));
  process.on("exit", () => ack("save", "ended"));
  const say = (l) => console.log(`${new Date().toISOString().slice(11, 19)} ${l}`);
  const end = (l) => { say(l); ack("save", l); };
  (async () => {
    if (job("writer").state !== "open") { const f = foldOnce("before the save"); if (f) say(f); }
    const d = deploy(argv[1]);
    if (!d.ok) return end(`save failed: ${d.lines.join(" ").slice(0, 300)}`);
    say(`saved: ${d.lines.filter((l) => /Updated|Created|Merged|⇄/.test(l)).join(" ") || "ok"}`);
    // Every push must happen, or the save didn't do what it says: it ends "incomplete", never "done".
    let missed = 0;
    say(push("--html", read("work/index.html") || "") ? "pushed the page again" : (missed++, "page push didn't happen (draw/fold.log)"));
    if (argv[2]) say(push("--status", argv[2]) ? `status: ${argv[2]}` : (missed++, "status push didn't happen (draw/fold.log)"));
    if (lost) return end(`save stopped: ${lost}`);
    if (missed) return end(`save incomplete: saved, but ${missed === 1 ? "a push" : `${missed} pushes`} didn't happen`);
    if (argv[3] !== "pictures") return end("save done");
    const slugs = [...new Set([...(read("work/index.html") || "").matchAll(/data-ss-id="direction-([a-z0-9-]+)"/g)].map((m) => m[1]))];
    const shots = await Promise.all(slugs.map(async (d) => {
      if (!within(`${d}.png`)) { refuse(`${d}.png`); say(`picture of ${d} refused: ${d}.png is a link`); return false; }
      for (let t = 1; t <= 2; t++) {
        const r = await runAsync(["spaces", "screenshot", space, "--width", "1920", "--height", "1080", "--section", `direction-${d}`, "-o", `${d}.png`]);
        if (!r.e) { say(`picture: ${d}.png`); return true; }
        say(`picture of ${d} refused (try ${t}): ${r.out.trim().split("\n").slice(-1)[0].slice(0, 200)}`);
        await new Promise((ok) => setTimeout(ok, 5000));
      }
      return false;
    }));
    end(shots.every(Boolean) ? "pictures done" : `pictures done, ${shots.filter((x) => !x).length} missing`);
  })();
  return;
}
if (cmd === "wait") {
  // A writer that stopped by itself (refused pushes, idle) is said first, before anything about a save.
  const note = idle();
  if (note) console.log(note);
  const w = job("writer");
  if (w.state === "unknown") { console.log(`can't tell whether a writer is running: ${w.why}; ${LOOK("write")}`); process.exit(1); }
  const j = job("save");
  if (j.state === "unknown") { console.log(`can't tell whether a save is running or how it went: ${j.why}; ${LOOK("save")}`); process.exit(1); }
  if (j.state === "none") { console.log("no save has run"); process.exit(note ? 1 : 0); }
  const e = settle("save", 100000);
  process.stdout.write(logText("draw/save.log") || "");
  if (e.state === "lapsed") { console.log(`the save (run ${e.id}) never said how it ended; its time ran out at ${at(e.deadline)}: run the save again`); process.exit(1); }
  if (e.state !== "done") { console.log(e.state === "open" ? `still saving: ${e.why}; run wait again` : `can't tell how the save went: ${e.why}`); process.exit(1); }
  // Success only for a save that did all it says: saved, pushed the page and status (and took pictures).
  process.exit(/^(save done|pictures done(, \d+ missing)?)$/.test(e.how) && !note.includes("refused") ? 0 : 1);
}
if (cmd === "write" && !bg) {
  const j = launchable("writer", "write");
  if (j.state === "open") { console.log(`a writer (run ${j.id}) may still be running: ${j.why}. Nothing started`); process.exit(0); }
  // A new build takes the frame from the page; a writer that stopped while idle keeps its frame.
  if (!here("draw/frame.html") || here("draw/stop")) {
    const page = read("work/index.html");
    if (page === null || !swap("draw/frame.html", page)) { console.error("write: no work/index.html to take the frame from"); process.exit(2); }
  }
  remove("draw/stop");
  const run = begin("writer", "draw/fold.out");
  console.log(`the writer is running (run ${run}): it folds draw/<slug>/*.html into draw/frame.html and pushes; log in draw/fold.log`);
  process.exit(0);
}
if (cmd === "stop") {
  // Success only on the writer's own word: it acknowledges, after its last push, for the run stop asked
  // to stop. Silence, or anything stop can't read, is a failure; then fold, push and save here.
  const fail = (l) => { console.error(`stop: ${l}; nothing saved`); process.exit(1); };
  const note = idle();
  if (note) console.log(note);
  sleep(3000); // the last edits fold within 2 s
  const w = job("writer");
  if (w.state === "unknown") fail(`${w.why}, so stop can't tell whether a writer is still running; it may be (${LOOK("write")})`);
  if (!write("draw/stop", w.id || "")) fail("draw/stop can't be written, so the writer can't be asked to stop");
  if (w.state === "lapsed") fail(`the writer (run ${w.id}) never said it stopped; its time ran out at ${at(w.deadline)}, so it can no longer push: \`fold.js write\` starts a new one, then stop again`);
  if (w.state === "none") console.log("no writer was started in this folder");
  else {
    const e = settle("writer", 30000);
    if (e.state !== "done" || e.id !== w.id) fail(`the writer (run ${w.id}) isn't confirmed stopped within 30 s: ${e.why || e.state}; it may still be running (draw/fold.log; ${LOOK("write")})`);
    console.log(`the writer (run ${w.id}) confirmed it stopped: ${e.how}`);
  }
  const s = settle("save", 60000);
  if (s.state === "unknown") fail(`${s.why}, so stop can't tell whether a save is still running; it may be (${LOOK("save")})`);
  if (s.state === "open") fail(`a save (run ${s.id}) isn't confirmed finished within 60 s: ${s.why}; it may still be running (draw/save.log)`);
  if (s.state === "lapsed") fail(`the last save (run ${s.id}) never said how it ended; its time ran out at ${at(s.deadline)}: \`fold.js save\`, \`fold.js wait\`, then stop again`);
  const f = foldOnce("stop");
  if (f) console.log(f);
  if (!argv[1]) process.exit(0);
  const d = deploy(argv[1]);
  console.log((d.ok ? "" : "save failed: ") + d.lines.filter((l) => !/^[↑]/.test(l) || !d.ok).join("\n"));
  process.exit(d.ok ? 0 : 1);
}

// The writer itself (`write` starts it in the background, as one run).
const me = job("writer");
if (me.id !== THIS_RUN) process.exit(2); // not the writer on record
DEADLINE = me.deadline;
write("draw/writer.pid", String(process.pid));
log(`the writer started (run ${THIS_RUN})`);
process.on("exit", () => ack("writer", "ended"));
// The idle clock follows the inputs (the folded parts and frame), whatever the pushes did; five refused
// pushes in a row stop it too, so nobody draws on into a page that isn't reaching the space.
let input = "", shown = "", said = "", changed = Date.now(), refusals = 0, how = "";
const until = DEADLINE - 60 * 1000, IDLE = 5 * 60 * 1000; // 30 minutes after `write`
const stopped = () => here("draw/stop");
const tried = (ok) => { refusals = ok ? 0 : refusals + 1; return ok; };
for (;;) {
  if (job("writer").id !== THIS_RUN || lost) { log(`the writer stopped without a word: ${lost || "its record (draw/writer.run) was changed or removed"}`); process.exit(1); }
  if (stopped()) how = "stop";
  else if (Date.now() > until) how = "30 minutes";
  else if (Date.now() - changed > IDLE) how = "no change to any part or the frame for 5 minutes";
  else if (refusals >= 5) how = "5 pushes in a row were refused (draw/fold.log says why), so the page isn't reaching the space";
  if (how) break;
  const page = fold();
  if (page && page.html !== input) { input = page.html; changed = Date.now(); }
  const may = () => !stopped() && refusals < 5;
  if (page && page.html !== shown && may()) {
    swap("work/index.html", page.html);
    if (tried(push("--html", page.html))) shown = page.html;
  }
  if (page && page.status && page.status !== said && may() && tried(push("--status", page.status))) said = page.status;
  sleep(1000);
}
log(`the writer stopped: ${how}`);
ack("writer", how); // the last act: no call to the CLI follows
process.exit(0);
