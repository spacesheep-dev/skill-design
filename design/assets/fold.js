#!/usr/bin/env node
// Every command the Design skill runs, so a person allows this one script (and check.js, which only
// reads) instead of a dozen shell commands. It works in one folder (the one holding work/ and draw/)
// and on one space: `start` stores its id in draw/space, and nothing here takes another. It runs only
// the spacesheep CLI, with fixed arguments (never a string it was given as a shell command); if the
// CLI isn't installed, npx downloads it from npm. It reads and writes only inside the folder, never
// through a link, and says each thing it does: here, in draw/fold.log (the writer) and in
// draw/save.log (a save).
//
//   node fold.js -C <folder> start <link> ["<status>"]   a status on the space ("Reading your brief" unless
//                                               given) and its source read into work/, side by side (the
//                                               starter instead, if its page is blank, and its empty
//                                               canvas pushed once the read is back), its id kept
//   node fold.js -C <folder> start --new "<title>"   a new space whose first version is a short page saying
//                                               it is being drawn, then the starter in work/ (below) and
//                                               its empty canvas pushed at once
//   node fold.js -C <folder> push                push work/index.html to the space once
//   node fold.js -C <folder> write               start the page's only writer in the background (below)
//   node fold.js -C <folder> brief               wait for draw/BRIEF.md to end with `end brief`, print it
//   node fold.js -C <folder> save "<message>" "<status>" [pictures]
//                                               in the background: save a version, put the status back,
//                                               push the page again, and with `pictures` take each whole
//                                               direction at 1440 and 390 px wide (<slug>-1440.png, and
//                                               <slug>-390.png cut into columns), and each device view
//                                               (data-view-of) once at its frame's width (a phone's
//                                               <slug>-phone-390.png), the page measuring itself for layout
//                                               faults as it is drawn; log in draw/save.log
//   node fold.js -C <folder> wait                wait for that save to end (at most 100 s), print its log;
//                                               exit 0 only for "save done…" or "pictures done: N pictures,
//                                               no layout faults". "layout check failed" means fix each
//                                               fault once, then stop (a fixed fault isn't measured again);
//                                               "save refused" means tell the person why and stop (below);
//                                               "save …", "pictures incomplete" and the rest mean save again
//   node fold.js -C <folder> stop "<message>"    ask the writer to stop and wait for its own word that it
//                                               has (else fail), fold the last edits, push them and save;
//                                               `stop` alone saves nothing and takes the work card down
//   node fold.js -C <folder> read ["<status>"]   a status on the space ("Reading your design" unless given),
//                                               then its current source read into work/ again: a
//                                               revision's first status, before anything changes; the
//                                               last build's frame and parts go to draw/_old/, so a save
//                                               sends work/ as edited
//   node fold.js -C <folder> title "<title>"     rename the space, and the page's <title>: only when the
//                                               person picks a new title (start keeps the one it has)
//   node fold.js -C <folder> focus <all|slug>    what the canvas shows: every direction, or the one named
//                                               (its <meta name="ss-canvas-focus">), then push the page
//   node fold.js -C <folder> kit                 before a page's first device view, or Export on an older page: its
//                                               switcher (styles and script, the script added if the page
//                                               dropped it) as the starter has it now, Export, the device buttons' row, the kit's
//                                               phone rules as container queries, and the layout check
//                                               the save's pictures run (added if the page has none), in
//                                               work/index.html; nothing else changes and nothing is pushed
//   node fold.js -C <folder> round <slug> "<name>"…   a new round: 1 to 5 versions of that direction, each named,
//                                               in a row of their own below everything on the canvas, each
//                                               joined to it by a line and starting from its tokens, with a
//                                               ⋯ menu and an empty part; the canvas then shows every direction;
//                                               nothing earlier changes and nothing is pushed
//   node fold.js -C <folder> copy <slug>         its own space, only when asked: that direction alone, its views
//                                               with it, in a new private space named after it; this one stays
//
// A folder from before fold.js kept run records (draw/writer.run, draw/save.run) gets them from start, read,
// kit, save, write, wait or stop, once no fold.js save or writer is running in it (adopt, below).
//
// A save the platform refuses on purpose (a page cut to a fraction of the version before it, files left
// out, a clash with edits made on the page) ends "save refused": nothing was saved, and saving again can't
// help. The refusal's own advice (drop_files, staged_sha) is for other tools and is left out: publishing
// another way would skip the pictures and the layout check. A new space starts from a page under 2 KB, not
// the 38 KB starter, because the platform measures a cut only against a page of 2 KB or more: a small
// design (a notice, a sign) is then never refused for being smaller than the starter it replaced.
//
// The writer folds each direction's parts, draw/<slug>/<NN>.html (each written whole with an agent's
// Write tool, its first line `<!-- status: Night Watch: prices -->`), in name order, into
// draw/frame.html between `<!-- part:<slug> -->` and `<!-- /part:<slug> -->`, writes work/index.html,
// and pushes the page and the status whenever they change. A file changed in the last 300 ms waits for
// the next pass, so a part is never folded half-written. A direction keeps its placeholder below its
// parts until they show 40 characters of text, so a first part of styles alone never blanks it.
// `push`, `save` and `write` name the starter's markers (part:first…) after the slug of the section holding
// them. A new build saved with no marker left was drawn in work/index.html: its status names the directions.
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
const COMMANDS = ["start", "push", "write", "brief", "save", "wait", "stop", "read", "focus", "kit", "title", "round", "copy"];
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
// Make a file whole, and only where nothing is: a copy of its own, then a hard link to the name, which fails
// if the name is taken (an exclusive create where hard links can't be made). true made, false already there
// (left as it is), null refused. So a record another command wrote in the meantime is never replaced.
function claim(f, text) {
  const t = `draw/.${f.replace(/\//g, "_")}.${process.pid}.new`;
  if (!within(t) || !within(f)) return refuse(f);
  fs.writeFileSync(t, text);
  try { fs.linkSync(t, f); return true; } catch (e) {
    if (e.code === "EEXIST") return false;
    try { fs.writeFileSync(f, text, { flag: "wx" }); return true; } catch (e2) { if (e2.code === "EEXIST") return false; throw e2; }
  } finally { fs.rmSync(t, { force: true }); }
}
// draw/work.sha is the page fold.js last put in work/index.html (a fold, the starter, a read), so a fold never
// undoes an edit made there since. setWork writes and records; rework (a renamed placeholder, a focus) keeps
// an edit made by hand marked as one.
const digest = (s) => require("crypto").createHash("sha256").update(s).digest("hex");
const ours = (html) => write("draw/work.sha", `${digest(html)}\n`);
const isOurs = (html) => html !== null && (read("draw/work.sha") || "").trim() === digest(html);
const setWork = (html) => swap("work/index.html", html) && ours(html);
const rework = (html) => { const clean = isOurs(read("work/index.html")); return swap("work/index.html", html) && (!clean || ours(html)); };
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
// (or none). Unknown stays unknown: no command replaces it or reads it as "none", except a missing record in a
// folder no run can be going in (adopt, below).
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
// A folder from before fold.js kept run records (an older skill made it) has no draw/writer.run or
// draw/save.run, and a missing record is unknown, so every job command would refuse it. A missing record (not
// a link, not unreadable) is set up as "none" only when no run can be going here: no process, other than this
// command and those that started it, is a fold.js write or save, or the CLI deploying or pushing this space,
// with this folder as its working folder (a process whose folder can't be told counts). Else it stays missing,
// and the line says which process holds it. It is made only where no record is (claim), so a run's record
// written by another command after the processes were listed is never replaced by "none".
const RUNLIKE = (args, id) => /fold\.js\b.*\s(save|write)(\s|$)/.test(args) || (!!id && args.includes(id) && /\s(deploy|live)\s/.test(args));
// A process's working folder (its real path): from /proc, else from lsof; null when it can't be told.
function cwdOf(pid) {
  try { return fs.realpathSync(`/proc/${pid}/cwd`); } catch {}
  for (const lsof of ["lsof", "/usr/sbin/lsof"]) {
    try {
      const n = (execFileSync(lsof, ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], { encoding: "utf8", timeout: 10000, killSignal: "SIGKILL", stdio: ["ignore", "pipe", "ignore"] }).match(/^n(.+)$/m) || [])[1];
      return n ? fs.realpathSync(n) : null;
    } catch {}
  }
  return null;
}
function adopt() {
  const gone = ["writer", "save"].filter((n) => within(`draw/${n}.run`) && !fs.existsSync(`draw/${n}.run`) && !isLink(`draw/${n}.run`));
  if (!gone.length) return;
  const names = gone.map((n) => `draw/${n}.run`).join(" and "), id = (read("draw/space") || "").trim();
  let rows;
  try {
    rows = execFileSync("ps", ["-A", "-o", "pid=,ppid=,args="], { encoding: "utf8", timeout: 10000, killSignal: "SIGKILL", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] })
      .split("\n").map((l) => l.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/)).filter(Boolean).map((m) => ({ pid: +m[1], ppid: +m[2], args: m[3] }));
  } catch (e) { console.log(`${names} missing, and the processes can't be listed (${why(e)}), so nothing tells whether a run is going here: left missing`); return; }
  const by = new Map(rows.map((r) => [r.pid, r])), mine = new Set();
  for (let p = process.pid; p > 1 && !mine.has(p); p = (by.get(p) || {}).ppid || 0) mine.add(p);
  const held = rows.filter((r) => !mine.has(r.pid) && RUNLIKE(r.args, UUID.test(id) && id)).filter((r) => { const c = cwdOf(r.pid); return c === null || c === ROOT; });
  if (held.length) { console.log(`${names} missing, and a run may be going in this folder (${held.slice(0, 3).map((r) => `process ${r.pid}: ${r.args.slice(0, 120)}`).join("; ")}): left missing until it has gone; the next fold.js command then sets them up`); return; }
  // Another command may have written a record since the processes were listed (a run's): claim leaves it.
  const made = [], came = [];
  for (const n of gone) { const r = claim(`draw/${n}.run`, "none\n"); if (r === null) process.exit(2); (r ? made : came).push(`draw/${n}.run`); }
  if (made.length) console.log(`set up ${made.join(" and ")} as none: this folder is from before fold.js kept run records, and no save or writer is running in it`);
  if (came.length) console.log(`${came.join(" and ")} appeared while the processes were checked (another fold.js command wrote it): left as it is`);
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
  execFile(cli[0], [...cli.slice(1), ...args], { timeout: t, killSignal: "SIGKILL", maxBuffer: 64 << 20 }, (e, out, err) => ok({ e, out: String(out || ""), err: String(err || "") }));
});
const why = (e) => String(e.stderr || e.message).trim().split("\n").slice(-3).join(" ").slice(0, 300);
// The same for a runAsync answer, and start's status line from one.
const tail = (r) => (r.err.trim() || String(r.e.message)).split("\n").slice(-3).join(" ").slice(0, 300);
const statusSaid = (r, words) => { if (r.e) console.error(`status refused: ${tail(r)}`); else { card("up"); console.log(`status: ${words}`); } };

// The one space: from start on, its id is in draw/space, checked as a UUID every time it's read.
let space = (read("draw/space") || "").trim();
if (cmd !== "start" && !UUID.test(space)) { console.error(`${cmd}: no space yet (draw/space holds no id); run start first, in this folder`); process.exit(2); }

// The work card on open tabs: a status puts it up, and a save or an empty status takes it down. draw/card keeps
// which came last, across commands, so `stop` knows whether a card is still up.
const card = (state) => swap("draw/card", state);
// The page goes through stdin, as JSON to the push_live tool: no argument limit (Linux refuses one over 128 KB).
// So does an empty status, which takes the work card down: the CLI's --status wants words.
function push(flag, value) {
  const html = flag === "--html", json = html || !value;
  const what = html ? `pushed the page (${value.length} bytes)` : value ? `pushed the status: ${value}` : "took the work card down (an empty status)";
  const t = allowed(20000);
  if (!t) { log(`${html ? "page" : "status"} not pushed: ${lost}`); return false; }
  try {
    run(json ? ["call", "push_live", "-"] : ["live", "push", "--space", space, flag, value],
      { input: json ? JSON.stringify(html ? { space, html: value } : { space, status: "" }) : "", stdio: ["pipe", "ignore", "pipe"], timeout: t });
    log(what);
    if (!html) card(value ? "up" : "down");
    return true;
  } catch (e) {
    // A tab behind another one doesn't answer in time, so the platform says no tab confirmed the push
    // within 2 s. It was sent all the same: not a refusal, so the build and its saves carry on.
    if (/no tab confirmed/i.test(`${e.stderr || ""} ${e.message}`)) {
      log(`${what}, but no tab confirmed it (a tab behind another can't): carrying on`);
      if (!html) card(value ? "up" : "down");
      return true;
    }
    log(`${html ? "page" : "status"} push refused: ${why(e)}`);
    return false;
  }
}
// A save, with everything the CLI says about it (its lines on stderr too: what landed, what merged).
// A deploy still running at its time limit is stopped, and the space's history says what happened: a
// version with this save's message, newer than the space's newest version before the deploy and with
// the page this save sent, means it landed and only the answer was late, so it counts as saved. No clock:
// an earlier version with the same message is never this save's, and nor is another writer's version
// with the same message and a different page. A deploy the CLI calls failed gets the same check, unless
// it was refused on purpose ("Nothing was published"): that save made no version, whatever came after.
// A save that ends any other way without a word says how it ended.
const SAVE_MS = Number(process.env.FOLD_SAVE_MS) || 60000; // a test's shorter limit; 60 s otherwise
const REFUSED = /Nothing was (?:published|deployed)[^.]*\./;
function deploy(message) {
  if (!work()) return { ok: false, lines: ["work/ holds a link"] };
  const before = history(1);
  const t = allowed(SAVE_MS);
  if (!t) return { ok: false, lines: [`not called: ${lost}`] };
  let page = null;
  try { page = fs.readFileSync("work/index.html"); } catch {}
  const r = spawnSync(cli[0], [...cli.slice(1), "deploy", "work", "--space", space, "-m", message], { encoding: "utf8", timeout: t, killSignal: "SIGKILL" });
  const said = `${r.stdout || ""}\n${r.stderr || ""}`.split("\n").map((l) => l.trim()).filter(Boolean).filter((l) => !/^spacesheep /.test(l));
  if (r.error && r.error.code === "ETIMEDOUT") {
    const s = `${Math.round(t / 1000)} s`, v = landed(message, before, page);
    if (v.version) return { ok: true, lines: [`Saved as version ${v.version}. The server answered late: fold.js stopped the CLI at ${s}, after the version was made.`] };
    return { ok: false, lines: [`no answer from the server in ${s}, and ${v.why || `the space has no version "${message}" newer than its newest before this save`}; save again: if it landed after all, that save makes no second version`] };
  }
  if (r.status !== 0 && !said.filter((l) => !/^[↑=]/.test(l)).length) said.unshift(`the CLI ended (${r.error ? why(r.error) : r.signal || `exit ${r.status}`}) without saying why`);
  // A deploy the CLI calls failed can still have made its version (its answer cut off by a restart): the
  // same check as above, so a save that landed is a save, and only one that didn't keeps the CLI's words.
  if (r.status !== 0 && !REFUSED.test(said.filter((l) => !/^[↑=]/.test(l)).join(" "))) {
    const v = landed(message, before, page);
    if (v.version) return { ok: true, lines: [`Saved as version ${v.version}. The version was made, though the CLI didn't get the server's usual answer.`] };
  }
  return { ok: r.status === 0, lines: said.slice(0, 8) };
}
// The space's history, newest first (at most n versions), or why it can't be read.
function history(n) {
  const t = allowed(15000);
  if (!t) return { why: lost };
  try { const j = JSON.parse(run(["versions", "list", "--space-id", space, "--limit", String(n), "--json"], { timeout: t })); return { all: j.versions || [], more: !!(j.page && j.page.next) }; }
  catch (e) { return { why: why(e) }; }
}
// This save's version, if the space has one: its message, above the version that was newest before the
// deploy, with this save's page (work/index.html as the deploy started) byte for byte. Its number when the
// whole history came in one page, else its id.
function landed(message, before, page) {
  if (before.why) return { why: `the space's history couldn't be read before the save (${before.why})` };
  if (!page) return { why: "work/index.html couldn't be read before the save" };
  const after = history(200);
  if (after.why) return { why: `the space's history can't be read (${after.why})` };
  const was = before.all[0], top = was ? after.all.findIndex((v) => v.id === was.id) : after.all.length;
  if (top < 0) return { why: `the space's newest version before this save (${was.id}) isn't among its newest ${after.all.length}` };
  let named = 0;
  for (const [i, v] of after.all.slice(0, top).entries()) {
    if ((v.label || "").trim() !== message.trim()) continue;
    named++;
    const p = pageOf(v.id);
    if (p.why) return { why: p.why };
    if (p.bytes.equals(page)) return { version: after.more ? v.id : String(after.all.length - i) };
  }
  return named ? { why: `the space has a version "${message}" newer than its newest before this save, but not with the page this save sent` } : {};
}
// A version's page (its index.html) byte for byte, or why it can't be had.
function pageOf(id) {
  const t = allowed(15000);
  if (!t) return { why: lost };
  try {
    const j = JSON.parse(run(["call", "get_file", "-"], { input: JSON.stringify({ space_id: space, file: "index.html", version: id }), timeout: t }));
    const f = (j && j.file) || {};
    const bytes = typeof f.data === "string" ? Buffer.from(f.data, "base64") : typeof f.content === "string" ? Buffer.from(f.content, "utf8") : null;
    if (!bytes || Number(j.next_offset) > 0) return { why: `version ${id}'s page couldn't be read whole` };
    return { bytes };
  } catch (e) { return { why: `version ${id}'s page couldn't be read (${why(e)})` }; }
}
// The last line of a save that made no version. A refusal on purpose says "Nothing was published" (the
// platform) or "Nothing was deployed" (the CLI): its words are kept up to there, and its advice is dropped.
const STOP = "Publish no other way (no create_version, deploy or upload): that skips the pictures and the layout check. Tell the person in one line why, and stop";
function unsaved(d) {
  const text = d.lines.filter((l) => !/^[↑=]/.test(l)).join(" ");
  const m = text.match(REFUSED);
  if (!m) return `save failed: ${text.slice(0, 300)}`;
  const words = text.slice(0, m.index + m[0].length);
  return `save refused: ${words.slice(words.lastIndexOf("✗") + 1).trim().slice(-400)} ${STOP}`;
}
// A new space's first version: the title, the starter's chat meta, and one line. It is one
// of the pages isBlank knows, so `start <link>` on it later puts the starter in work/, as for any blank page.
// The starter, base.html beside this script: read when a command needs it.
const baseHtml = () => fs.readFileSync(path.join(__dirname, "base.html"), "utf8");
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const firstPage = (title, base) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${(base.match(/<meta name="ss-chat"[^>]*>/g) || []).join("\n")}
<style>body { margin: 0; padding: 32px 20px; font: 18px/1.5 system-ui, sans-serif; }</style>
</head>
<body>
<p>${esc(title)} is being drawn. It fills in here in a moment.</p>
</body>
</html>
`;
// Spacesheep's page for a new space (sheep.new, or a space made with no page): its starterHtml, as it is stored.
const platformBlank = (title) => `<!doctype html>
<html lang="en" data-ss-id="root">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
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
// A blank page gets the starter; anything else is a design, and start never puts the starter over it. Blank is
// one of the pages known to be empty, whatever their title: an empty file, Spacesheep's new page, and this
// skill's first version from start --new. Nothing else, however empty it looks: if the platform changes its new
// page by a character, start reads it as a design and the starter is laid by hand, and nothing is lost.
const knownPage = (make) => new RegExp(`^${make("\u0000").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").split("\u0000").join("[^<]*")}$`);
function isBlank(h) {
  const page = (h || "").replace(/\r\n/g, "\n").trim();
  if (!page) return true;
  const base = baseHtml();
  // Before v1.2.22 the first version also carried <meta name="ss-workspace" content="design"> after the chat meta.
  const older = (t) => firstPage(t, base).replace(/(<meta name="ss-chat"[^>]*>)/, '$1\n<meta name="ss-workspace" content="design">');
  return [platformBlank, (t) => firstPage(t, base), older].some((make) => knownPage(make).test(page));
}
// The starter with the space's own title: a design never renames the space unasked (`title` does, on the person's pick).
const titled = (base, title) => base.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`);
// The starter with no directions: the canvas and its frame, pushed the moment a blank page is known, before any design.
const emptyCanvas = (base) => base.replace(/^<section class="direction"[\s\S]*?^<\/section>\n*/gm, "");
// One space per folder: start never points a folder at a second space.
// The folder's space, kept in draw/space: false (and said why) when the folder is another space's or can't be written.
function keep(id) {
  const had = (read("draw/space") || "").trim();
  if (had && had !== id) { console.error(`start: this folder is for space ${had}; use another folder for ${id}`); return false; }
  return write("draw/space", id);
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
    }
    if (status) statuses.push(status);
    const g = good[slug];
    return `<!-- part:${slug} -->${g === undefined ? inner : shownChars(g) >= 40 ? g : g + inner}<!-- /part:${slug} -->`;
  });
  return { html, status: statuses.join(" · ").slice(0, 200), waiting };
}
// Fold once here, when no writer is running (after stop, or after its idle limit), so no edit is left out.
// Never over an edit made in work/index.html since fold.js last wrote it: that is refused, and nothing is saved.
function foldOnce(what) {
  let page = fold();
  for (let i = 0; page && page.waiting && i < 10; i++) { sleep(400); page = fold(); } // a part still being written
  const now = read("work/index.html");
  if (!page || page.html === now) return {};
  if (now !== null && here("draw/work.sha") && !isOurs(now))
    return { refused: "work/index.html was changed after fold.js last wrote it, and folding draw/ (the frame and its parts) over it would undo that change. Make the change in draw/frame.html, or in the part it belongs to (draw/<slug>/NN.html), then save again" };
  if (!setWork(page.html)) return {};
  return { line: push("--html", page.html) ? `${what}: folded and pushed the last edits` : `${what}: folded the last edits; the push was refused (draw/fold.log)` };
}
// A revision starts from the page as the space has it. The last build's frame and parts are put aside, in
// draw/_old/<time>/ (moved, not deleted), so no fold puts them back over the page just read, and a later
// write takes its frame from that page. Only what fold() reads is moved: the frame, and for each part marker
// its folder of parts (draw/<slug>/). fold.js's own files (draw/space, draw/card, draw/stop, the logs…) are
// never a folder, and "_old" can't be a slug, so a part named "space" or "old" moves only its parts.
function retire() {
  const frame = read("draw/frame.html");
  if (frame === null) return "";
  const slugs = new Set([...`${frame}${read("work/index.html") || ""}`.matchAll(/<!-- part:([a-z0-9-]+) -->/g)].map((m) => m[1]));
  const is = (f, folder) => { if (!within(f)) return false; try { const st = fs.lstatSync(f); return folder ? st.isDirectory() : st.isFile(); } catch { return false; } };
  const to = `draw/_old/${new Date().toISOString().replace(/[:.]/g, "-")}`;
  mkdir(to);
  const moved = [];
  for (const [f, folder] of [["draw/frame.html", false], ...[...slugs].map((d) => [`draw/${d}`, true])]) {
    if (!is(f, folder)) continue;
    fs.renameSync(f, `${to}/${path.basename(f)}`);
    moved.push(f.slice(5));
  }
  log(`a revision: the last build (${moved.join(", ")}) put aside in ${to}`);
  return `the last build's frame and parts are put aside in ${to}: edit work/index.html, and a save sends it as it is`;
}
// A direction card's ⋯ menu, for a name as it is written in the section's data-ss-label: Use this ("Use <name>")
// and Another round ("Another round of <name>"), each said in the chat as the person.
function cardMenu(n) {
  return `<div class="card-menu no-print" data-ss-canvas="label"><button type="button" class="menu-open" aria-haspopup="menu" aria-expanded="false" aria-label="Menu for ${n}">⋯</button>` +
  `<div class="menu" role="menu" hidden><button type="button" class="use-this" role="menuitem" data-ss-say="Use ${n}" title="Use ${n}"><span class="use">Use this</span><span class="chosen">✓ Chosen</span></button>` +
  `<button type="button" class="round" role="menuitem" data-ss-say="Another round of ${n}" title="Another round of ${n}">Another round</button></div></div>`;
}
// The starter's placeholders keep its names (part:first, part:second, part:third) until fold.js renames each
// with the slug of the section holding it, and its heading with that section's name; each section's menu (or an
// older page's "Use this design" pill) says its name. So step 2's Edits stop at the sections' opening tags and
// never reach a placeholder or a menu. Not while a writer owns work/index.html.
function nameParts() {
  const page = read("work/index.html");
  if (!page || job("writer").state === "open") return;
  const named = page.replace(/(<section\b[^>]*data-ss-id="direction-([a-z0-9-]+)"[^>]*>)([\s\S]*?)(?=<\/section>)/g, (m, open, slug, body) =>
    open + body.replace(/<div class="card-menu[^"]*" data-ss-canvas="label">[\s\S]*?<\/div><\/div>|<button type="button" class="use-this[^"]*"[^>]*>/, (b) => {
      const l = open.match(/data-ss-label="([^"]*)"/);
      return !l ? b : b.startsWith("<div") ? cardMenu(l[1]) : b.replace(/ data-ss-say="[^"]*"/, () => ` data-ss-say="Use ${l[1]}"`).replace(/ title="[^"]*"/, () => ` title="Use ${l[1]}"`);
    }).replace(/<!-- part:(first|second|third) -->([\s\S]*?)<!-- \/part:\1 -->/, (p, old, inner) => old === slug ? p : `<!-- part:${slug} -->${inner
      .replace(`data-ss-id="${old}-drawing"`, `data-ss-id="${slug}-drawing"`)
      .replace(/<h2>[^<]*<\/h2>/, (h) => { const l = open.match(/data-ss-label="([^"]*)"/); return l ? `<h2>${l[1]}</h2>` : h; })}<!-- /part:${slug} -->`));
  if (named !== page) rework(named);
}
// A new build drawn straight into work/index.html, not as parts: no part marker is left, so no part's status
// reached the person. "A, B and C are up", or "" when it was drawn as parts.
function drawnInOneGo(page) {
  if (!here("draw/starter") || !page || /<!-- part:[a-z0-9-]+ -->/.test(page)) return "";
  const names = [...page.matchAll(/<section\b[^>]*data-ss-id="direction-[a-z0-9-]+"[^>]*>/g)]
    .map((m) => ((m[0].match(/data-ss-label="([^"]*)"/) || [])[1] || "").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")).filter(Boolean);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)} are up` : names.length ? `${names[0]} is up` : "";
}
// Why the writer stopped, when it stopped by itself (no change for 5 minutes, refused pushes, 30 minutes).
function idle() {
  const j = job("writer");
  if (j.state !== "done" || j.how === "stop" || !here("draw/frame.html")) return "";
  return `the writer stopped: ${j.how}; \`fold.js write\` starts it again`;
}

// Said when the starter is in work/, just before the agent draws: how each direction reaches the person.
const NEXT = 'next: Edit the directions\' tokens and each section\'s opening tag (slug, name, line) in work/index.html, one Edit each, and leave every <!-- part:… --> placeholder as it is (fold.js names it after its section). Then fold.js push, fold.js save "Frame" "Drawing three directions", fold.js write, and each direction as draw/<slug>/01.html, 02.html…, its first line its status. A direction drawn in work/index.html shows no status.';
// Each command that starts a run or reads one first sets up an older folder's missing records, when that's safe.
if (!bg && !NEW && ["start", "read", "kit", "save", "write", "wait", "stop"].includes(cmd)) adopt();
if (cmd === "start") {
  // Only a folder's first start may say that no writer or save has run in it.
  // (A record already there was written by a command started since: it's left as it is.)
  if (NEW) for (const name of ["writer", "save"]) if (claim(`draw/${name}.run`, "none\n") === null) process.exit(2);
  if (argv[1] === "--new") {
    if ((read("draw/space") || "").trim()) { console.error("start: this folder already has a space; use another folder for a new one"); process.exit(2); }
    mkdir("work");
    const base = baseHtml(), title = plain("title", argv[2]) || "Design";
    if (!work() || !setWork(firstPage(title, base))) process.exit(2);
    const out = run(["deploy", "work", "--title", title, "--json"]);
    const j = JSON.parse(out.slice(out.indexOf("{")));
    space = (j.space || {}).id;
    if (!UUID.test(space || "")) { console.error("start: the new space's id isn't in the answer"); process.exit(1); }
    if (!keep(space)) process.exit(2);
    const page = titled(base, title);
    if (!setWork(page) || !write("draw/starter", "1\n")) process.exit(2);
    // The status goes up beside the empty canvas, not before it.
    const status = runAsync(["live", "push", "--space", space, "--status", "Reading your brief"]);
    const pushed = push("--html", emptyCanvas(page));
    (async () => {
      statusSaid(await status, "Reading your brief");
      console.log(pushed ? "pushed the empty canvas" : "the empty canvas wasn't pushed (draw/fold.log)");
      console.log(`made a new space; the starter is in work/index.html: ${(j.space || {}).url || space}\nspace: ${space}\n${NEXT}`);
      process.exit(0);
    })();
    return;
  }
  const link = plain("link", argv[1]), first = (plain("status", argv[2]) || "Reading your brief").slice(0, 200);
  if (!link) { console.error("start: give the space's link, or --new \"<title>\""); process.exit(2); }
  if (!work()) process.exit(2);
  // The empty canvas is the first thing the person sees, so nothing waits in a row before it: in a folder with no
  // space yet, the space's details and its page are read at once, the status goes up as soon as its id is known,
  // and a blank page's empty canvas the moment the read is back. A folder that has a space reads only once
  // the link is known to be that space.
  const fresh = !space, reading = fresh ? runAsync(["read", link, "-o", "work"]) : null;
  (async () => {
    // A start that ends early lets its read finish first, so nothing lands in work/ after it has said it ended.
    const fail = async (line, code) => { if (reading) await reading; if (line) console.error(line); process.exit(code); };
    const got = await runAsync(["spaces", "get", link]);
    if (got.e) return fail(`start: spaces get ${link} refused: ${tail(got)}`, 1);
    const title = ((got.out.match(/^ *title: (.*)$/m) || [])[1] || "").trim();
    space = ((got.out.match(/^ *id: (.*)$/m) || [])[1] || "").trim();
    if (!UUID.test(space)) return fail(`start: no id in the answer to spaces get ${link}`, 1);
    if (!keep(space)) return fail("", 2);
    const status = runAsync(["live", "push", "--space", space, "--status", first]);
    const r = await (reading || runAsync(["read", space, "-o", "work"]));
    if (r.e) { console.error(`start: read ${link} refused: ${tail(r)}`); process.exit(1); }
    process.stdout.write(r.out);
    ours(read("work/index.html") || "");
    const aside = retire();
    if (aside) console.log(aside);
    let pushed = null;
    if (isBlank(read("work/index.html"))) {
      const base = titled(baseHtml(), title || "Untitled");
      if (!setWork(base) || !write("draw/starter", "1\n")) process.exit(2);
      pushed = push("--html", emptyCanvas(base));
    } else remove("draw/starter"); // a revision: section 7, not a new build
    statusSaid(await status, first);
    if (pushed !== null) console.log(`${pushed ? "pushed the empty canvas" : "the empty canvas wasn't pushed (draw/fold.log)"}\nwork/index.html held no design: the starter is in its place\n${NEXT}`);
    console.log(`space: ${space}\ntitle: ${title} (the person's: keep it)`);
    process.exit(0);
  })();
  return;
}
// A new title, only when the person picked one: the space's (as lists and links show it) and the page's <title>.
if (cmd === "title") {
  const want = (plain("title", argv[1]) || "").trim().slice(0, 200);
  if (!want) { console.error('title: give the title the person picked, title "<title>"'); process.exit(2); }
  run(["spaces", "update", space, "--title", want]);
  for (const f of ["work/index.html", "draw/frame.html"]) {
    const p = read(f);
    if (p !== null && /<title>[^<]*<\/title>/.test(p) && !(f === "work/index.html" ? rework(titled(p, want)) : swap(f, titled(p, want)))) process.exit(2);
  }
  console.log(`title: ${want}; the next push or save carries it to the page`);
  process.exit(0);
}
// A revision's first word to the person: the status goes up before the read, so the page says something
// changes before anything does (a refused push is said and the read goes on).
if (cmd === "read") {
  const words = (plain("status", argv[1]) || "Reading your design").slice(0, 200);
  console.log(push("--status", words) ? `status: ${words}` : "status not pushed (draw/fold.log); reading all the same");
  if (!work()) process.exit(2);
  process.stdout.write(run(["read", space, "-o", "work"]));
  ours(read("work/index.html") || "");
  const aside = retire();
  if (aside) console.log(aside);
  process.exit(0);
}
// The canvas's focus: <meta name="ss-canvas-focus" content="all"> shows every direction, content="direction-<slug>"
// opens that one. Spacesheep's canvas reads it at load and on every live change; a person's own pick in a tab
// holds until it changes again. `focus` sets it in work/index.html and in the writer's frame (a page without the
// meta gets it after the ss-canvas meta, else before </head>), then pushes the page, or leaves that to a running
// writer, which pushes the frame when it changes.
function withFocus(page, value) {
  const tag = `<meta name="ss-canvas-focus" content="${value}">`, at = /<meta name="ss-canvas-focus"[^>]*>/;
  if (at.test(page)) return page.replace(at, tag);
  if (/<meta name="ss-canvas"[^>]*>/.test(page)) return page.replace(/<meta name="ss-canvas"[^>]*>/, (m) => `${m}\n${tag}`);
  return /<\/head>/i.test(page) ? page.replace(/<\/head>/i, `${tag}\n</head>`) : null;
}
if (cmd === "focus") {
  const want = plain("focus", argv[1]) || "", page = read("work/index.html");
  if (page === null) { console.error("focus: no work/index.html"); process.exit(2); }
  const slugs = [...new Set([...page.matchAll(/<section\b[^>]*data-ss-id="direction-([a-z0-9-]+)"/g)].map((m) => m[1]))];
  const slug = want.replace(/^direction-/, "");
  if (want !== "all" && !slugs.includes(slug)) { console.error(`focus: give all or a direction on the page (${slugs.join(", ") || "it has none"})`); process.exit(2); }
  const value = want === "all" ? "all" : `direction-${slug}`;
  for (const f of ["work/index.html", "draw/frame.html"]) {
    const p = read(f);
    if (p === null) continue;
    const set = withFocus(p, value);
    if (set === null) { console.error(`focus: ${f} has no <head> to put the focus in`); process.exit(2); }
    if (set !== p && !(f === "work/index.html" ? rework(set) : swap(f, set))) process.exit(2);
  }
  if (job("writer").state === "open") { console.log(`focus: ${value}; the writer pushes it`); process.exit(0); }
  const ok = push("--html", read("work/index.html"));
  console.log(ok ? `focus: ${value}, pushed` : "focus set, but the push was refused: see draw/fold.log");
  process.exit(ok ? 0 : 1);
}
// Spacesheep's canvas is one block of the page, <div data-ss-canvas-area>, and only what is in it is on the canvas;
// the whole-page <meta name="ss-canvas"> is gone, so a page that still has it shows its directions as a plain page.
// Such a page loses the meta and gets the area, from its first direction (or the rounds' lines, if they come first)
// to the end of its last, so the views, versions and lines between them are in it, and the bar stays above it. Its
// own canvas tests (meta[name="ss-canvas"][content="on"], in its styles and scripts) become the area's. A page
// without the meta, or with the area already, comes back as it is.
function areaed(page) {
  const meta = /^[ \t]*<meta name="ss-canvas"(?=[\s>])[^>]*>[ \t]*\n?/m;
  if (!meta.test(page)) return page;
  const out = page.replace(meta, "").replace(/meta\[name="ss-canvas"\]\[content="on"\]/g, "[data-ss-canvas-area]");
  const flat = out.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi, (c) => " ".repeat(c.length));
  if (/<[a-z][^>]*\sdata-ss-canvas-area(?=[\s=>])/i.test(flat)) return out;
  const opens = [...flat.matchAll(/<section\b[^>]*class="[^"]*\bdirection\b[^"]*"[^>]*>/g)];
  if (!opens.length) return out;
  const last = opens[opens.length - 1], tags = /<section\b[^>]*>|<\/section>/gi;
  let a = opens[0].index, b = -1;
  tags.lastIndex = last.index + last[0].length;
  for (let depth = 1, t; (t = tags.exec(flat)); ) if (!(depth += t[0][1] === "/" ? -1 : 1)) { b = t.index + t[0].length; break; }
  if (b < 0) return out;
  const lines = /<div\b[^>]*\sdata-round-lines(?=[\s=>])[^>]*>(?:(?!<\/?div\b)[\s\S])*<\/div>/i.exec(flat);
  if (lines) { a = Math.min(a, lines.index); b = Math.max(b, lines.index + lines[0].length); }
  return out.slice(0, a) + "<div data-ss-canvas-area>\n\n" + out.slice(a, b) + "\n\n</div>" + out.slice(b);
}
// A page made before device views has a switcher that would make a view a tab, kit rules that follow the
// window, and maybe no layout check or Export: `kit` puts in the starter's switcher spans (each /* switcher: start */ … /* switcher: end */, the
// styles' in a <style>, the script's in a <script>), the script's in a <script> of its own when the page has
// none (one design, whose script was dropped), the device buttons' row (before the switcher's line, else at
// the end of the switcher, else in a nav of its own, shown only when it has buttons), and container queries
// for the kit's phone rules in the starter's own <style>, and the starter's layout check (/* check: start */ …
// /* check: end */) for the page's marked one, or in a <script> of its own on a page with none, and Export last in the
// bar's row (a bar with no row gets none) with the page's end mark. It changes work/index.html and the writer's frame,
// if there is one, and pushes nothing: the view's own Edits come next.
function kitted(page) {
  const span = /\/\* switcher: start \*\/[\s\S]*?\/\* switcher: end \*\//g;
  // A span is the styles' or the script's: the nearer opening tag before it says which.
  const kind = (text, at) => (text.lastIndexOf("<script", at) > text.lastIndexOf("<style", at) ? "script" : "style");
  const base = baseHtml(), now = {};
  for (const m of base.matchAll(span)) now[kind(base, m.index)] = m[0];
  const had = [...page.matchAll(span)].map((m) => kind(page, m.index));
  if (!had.includes("style")) return null;
  page = areaed(page);
  let out = page.replace(span, (m, at) => now[kind(page, at)]);
  // The bar's zoom figure is gone: the canvas area draws its own zoom.
  out = out.replace(/[ \t]*<output class="frame-zoom"[^>]*>[^<]*<\/output>\n?/, "");
  // What kit adds at the page's end goes before its end mark (<!-- design: end -->), else before </body>.
  const atEnd = (add) => { const end = out.lastIndexOf("<!-- design: end -->"), body = end >= 0 ? end : out.lastIndexOf("</body>"); out = body >= 0 ? out.slice(0, body) + add + out.slice(body) : out + "\n" + add; };
  if (!had.includes("script")) atEnd(`<script>\n${now.script}\n</script>\n`);
  const row = '<div class="switcher-views" role="group" aria-label="Device views"></div>';
  if (!/class="switcher-views"/.test(out)) {
    if (/<p class="switcher-line"/.test(out)) out = out.replace(/([ \t]*)<p class="switcher-line"/, (m, pad) => `${pad}${row}\n${m}`);
    else if (/<nav\b[^>]*class="[^"]*\bswitcher\b[^"]*"[^>]*>/.test(out)) out = out.replace(/(<nav\b[^>]*class="[^"]*\bswitcher\b[^"]*"[^>]*>[\s\S]*?)(\n?[ \t]*<\/nav>)/, (m, a, b) => `${a}\n  ${row}${b}`);
    else out = out.replace(/<body\b[^>]*>/, (m) => `${m}\n<nav class="switcher no-print" aria-label="Design views" data-ss-react="off">\n  <div class="switcher-row">\n  </div>\n  ${row}\n</nav>`);
    if (!/class="switcher-views"/.test(out)) return null;
  }
  // Export, last in the bar's row (whose end is the </div> that closes its <div class="switcher-row">), and the
  // page's end mark before </body>, after which Export's HTML file leaves out what the platform adds.
  if (!/class="export[ "]/.test(out)) {
    const row = /<div class="switcher-row">/.exec(out), tags = /<(\/?)div\b[^>]*>/g;
    if (row) {
      tags.lastIndex = row.index + row[0].length;
      for (let depth = 1, m; (m = tags.exec(out)); ) if (!(depth += m[1] ? -1 : 1)) { out = out.slice(0, m.index) + "  " + base.match(/<div class="export no-print">[\s\S]*?<\/p><\/div>/)[0] + "\n  " + out.slice(m.index); break; }
    }
  }
  if (!out.includes("<!-- design: end -->") && out.includes("</body>")) atEnd("<!-- design: end -->\n");
  const first = [...out.matchAll(span)].find((m) => kind(out, m.index) === "style"), at = first ? first.index : -1;
  const open = out.lastIndexOf("<style", at), close = out.indexOf("</style>", at);
  if (at >= 0 && open >= 0 && close > at) out = out.slice(0, open) + out.slice(open, close).replace(/@media \(max-width: 40rem\)/g, "@container (max-width: 40rem)")
    .replace(/clamp\(var\(--step-3\), 5vw, var\(--step-5\)\)/g, "clamp(var(--step-3), 5cqi, var(--step-5))") + out.slice(close);
  // The layout check the save's pictures run (?ss-check): the starter's in place of the page's own marked one,
  // or in a <script> of its own at the page's end when the page has none, so its pictures are measured.
  const check = /\/\* check: start \*\/[\s\S]*?\/\* check: end \*\//, nowCheck = base.match(check)[0];
  if (check.test(out)) out = out.replace(check, () => nowCheck);
  else if (!out.includes("ss-fault/")) atEnd(`<script>\n${nowCheck}\n</script>\n`);
  return out;
}
if (cmd === "kit") {
  const page = read("work/index.html");
  if (page === null) { console.error("kit: no work/index.html"); process.exit(2); }
  let changed = 0;
  for (const f of ["work/index.html", "draw/frame.html"]) {
    const p = read(f);
    if (p === null) continue;
    const set = kitted(p) ?? (areaed(p) !== p ? areaed(p) : null);
    if (set === null) { console.error(`kit: ${f} has no starter switcher to bring up to date (no /* switcher: start */ span in a <style>, or no <body> for its device row); its views still show on the canvas, with no device buttons without it`); process.exit(2); }
    if (set !== p) { if (!(f === "work/index.html" ? rework(set) : swap(f, set))) process.exit(2); changed++; }
  }
  console.log(changed ? "kit: the canvas area, the switcher, Export, the device buttons' row, the kit's phone rules and the layout check are now the starter's; nothing pushed" : "kit: already current");
  process.exit(0);
}
// A new round: versions of one direction in a row of their own below everything on the canvas, each joined to
// it by a line, so nothing from earlier rounds moves or goes. Each version is a direction as the starter's are
// (a ⋯ menu, an empty part, its parent's frame size, and its parent's tokens as a rule of its own)
// with data-version-of="<its parent's slug>", after the last direction, so views keep the numbers after the
// directions. The lines are one block, a <div data-round-lines> of fold.js's own, drawn again from every
// data-version-of on the page and shown only on the canvas, behind the frames. The canvas then shows every
// direction. It changes work/index.html and the writer's frame, if there is one, and pushes nothing: the versions'
// Edits come next.
const FRAME_SIZES = { desktop: [1280, 800], tablet: [820, 1180], phone: [390, 844] };
const ROW_GAP = 320, FRAME_GAP = 72;
const attrOf = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`)); return m ? m[1] : null; };
const num = (v) => (v !== null && v.trim() !== "" && isFinite(+v) ? +v : null);
// The page with its comments, styles and scripts blanked to spaces, so what's found in it is at the same place in
// the page (the starter's CSS names a section tag in a comment).
const blanked = (html) => html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi, (c) => " ".repeat(c.length));
// Each direction's section, views too: its slug, attributes, size and place, and where it starts and ends.
function directionsOf(html) {
  const page = blanked(html);
  const out = [], open = /<section\b[^>]*class="[^"]*\bdirection\b[^"]*"[^>]*>/g;
  for (let m; (m = open.exec(page)); ) {
    const tags = /<section\b[^>]*>|<\/section>/gi;
    let depth = 1, end = -1;
    tags.lastIndex = m.index + m[0].length;
    for (let t; (t = tags.exec(page)); ) if (!(depth += t[0][1] === "/" ? -1 : 1)) { end = t.index + t[0].length; break; }
    if (end < 0) break;
    const frame = attrOf(m[0], "data-ss-frame"), raw = /^(\d{1,5})x(\d{1,5})$/i.exec(frame || "");
    const size = FRAME_SIZES[frame] || (raw ? [+raw[1], +raw[2]] : [null, null]);
    out.push({ slug: (m[0].match(/data-ss-id="direction-([a-z0-9-]+)"/) || [])[1], start: m.index, end, frame,
      view: attrOf(m[0], "data-view-of"), of: attrOf(m[0], "data-version-of"), round: num(attrOf(m[0], "data-round")), label: attrOf(m[0], "data-ss-label"),
      x: num(attrOf(m[0], "data-ss-x")), y: num(attrOf(m[0], "data-ss-y")), w: size[0], h: size[1] });
    open.lastIndex = end;
  }
  return out;
}
// The lines block for the page as it stands: from the top middle of each version up, across and up to its parent's
// bottom middle, turning 96 px under the parent's row. None, with no versions. The block is the one <div> marked
// data-round-lines, holding only its picture: nothing else on the page is taken for it or replaced, whatever its
// class or id, and its id is one no other element has.
const LINES = /<div\b[^>]*\sdata-round-lines(?=[\s=>])[^>]*>(?:(?!<\/?div\b)[\s\S])*<\/div>\n?/i;
function withLines(page) {
  const all = directionsOf(page), by = new Map(all.map((d) => [d.slug, d]));
  const found = LINES.exec(blanked(page)), rest = found ? page.slice(0, found.index) + page.slice(found.index + found[0].length) : page;
  const put = (html) => page.slice(0, found.index) + html + page.slice(found.index + found[0].length);
  const pairs = all.filter((v) => v.of && by.has(v.of)).map((v) => [by.get(v.of), v])
    .filter((pv) => pv.every((d) => [d.x, d.y, d.w, d.h].every((n) => n !== null)));
  if (!pairs.length) return found ? put("") : page;
  const lines = pairs.map(([p, v]) => {
    const ax = p.x + p.w / 2, ay = p.y + p.h, bx = v.x + v.w / 2, by = v.y;
    const mid = by - ROW_GAP * 0.7 > ay + 24 ? by - ROW_GAP * 0.7 : (ay + by) / 2;
    return { ax, ay, bx, by, mid };
  });
  const x0 = Math.min(...lines.flatMap((l) => [l.ax, l.bx])) - 2, x1 = Math.max(...lines.flatMap((l) => [l.ax, l.bx])) + 2;
  const y0 = Math.min(...lines.map((l) => l.ay)), y1 = Math.max(...lines.map((l) => l.by));
  const n = (v) => +v.toFixed(1);
  const paths = lines.map(({ ax, ay, bx, by, mid }) => {
    const [a, b, c, d, m] = [ax - x0, ay - y0, bx - x0, by - y0, mid - y0].map(n), s = Math.sign(c - a), r = n(Math.min(16, Math.abs(c - a) / 2, m - b, d - m));
    return s ? `<path d="M${c} ${d}V${n(m + r)}Q${c} ${m} ${n(c - s * r)} ${m}H${n(a + s * r)}Q${a} ${m} ${a} ${n(m - r)}V${b}"/>` : `<path d="M${c} ${d}V${b}"/>`;
  }).join("");
  const w = n(x1 - x0), h = n(y1 - y0), ids = new Set([...rest.matchAll(/data-ss-id="([^"]+)"/g)].map((m) => m[1]));
  let id = found ? attrOf(found[0].match(/^<div\b[^>]*>/)[0], "data-ss-id") : null;
  if (!id || ids.has(id)) { id = "round-lines"; for (let k = 2; ids.has(id); k++) id = `round-lines-${k}`; }
  const html = `<div class="no-print" data-round-lines data-ss-id="${id}" aria-hidden="true" data-ss-x="${n(x0)}" data-ss-y="${n(y0)}" style="width:${w}px!important;height:${h}px!important"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${paths}</svg></div>\n`;
  if (found) return put(html);
  const { at, lead } = afterLast(page, all);
  return page.slice(0, at) + lead + html + page.slice(at);
}
// Where something goes after the last direction: the start of the next line when nothing else is on the rest of
// its line, else right after its </section> on a line of its own (lead), so a page that closes the canvas area
// on the same line (</section></div>) keeps what is added inside the area.
function afterLast(page, all) {
  const end = all.filter((d) => !d.view).at(-1).end, nl = page.indexOf("\n", end);
  return nl >= 0 && !page.slice(end, nl).trim() ? { at: nl + 1, lead: "" } : { at: end, lead: "\n" };
}
const slugOf = (name) => name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
// The page with the new round in it, or { error }.
function rounded(page, parent, names) {
  const all = directionsOf(page), p = all.find((d) => d.slug === parent && !d.view);
  const known = all.filter((d) => !d.view).map((d) => d.slug);
  if (!p) return { error: `round: give the slug of the direction the versions come from (${known.join(", ") || "the page has none"})` };
  const unplaced = all.filter((d) => [d.x, d.y, d.w, d.h].some((v) => v === null)).map((d) => d.slug || "a section");
  if (unplaced.length) return { error: `round: ${unplaced.join(", ")} has no data-ss-frame size or no data-ss-x and data-ss-y, so a row can't go under everything: give each its frame and place first` };
  const taken = new Set(all.map((d) => d.slug)), ids = new Set([...page.matchAll(/data-ss-id="([^"]+)"/g)].map((m) => m[1]));
  const versions = [];
  for (const name of names) {
    const slug = slugOf(name);
    if (!slug) return { error: `round: "${name}" makes no slug: name each version in letters or numbers` };
    if (taken.has(slug) || ids.has(`direction-${slug}`) || versions.some((v) => v.slug === slug)) return { error: `round: a direction is already called ${slug}: give "${name}" another name` };
    if (here(`draw/${slug}`) && !fs.statSync(`draw/${slug}`).isDirectory()) return { error: `round: draw/${slug} is one of fold.js's own files: give "${name}" another name` };
    versions.push({ name, slug });
  }
  // The page's directions are round 1, and each round after takes the next number (a version without one counts as 2).
  const n = Math.max(1, ...all.filter((d) => d.of).map((d) => d.round || 2)) + 1;
  const top = Math.max(...all.map((d) => d.y + d.h)) + ROW_GAP, width = names.length * p.w + (names.length - 1) * FRAME_GAP;
  const left = Math.round(p.x + p.w / 2 - width / 2);
  const sections = versions.map((v, i) => `<section class="direction" data-version-of="${p.slug}" data-round="${n}" data-ss-frame="${p.frame}" data-ss-section data-ss-id="direction-${v.slug}" data-ss-thing="direction/${v.slug}" data-ss-label="${esc(v.name)}" data-line="What it changes from ${p.label || p.slug}, and what that gives up." data-ss-x="${left + i * (p.w + FRAME_GAP)}" data-ss-y="${top}">
  ${cardMenu(esc(v.name))}
  <!-- part:${v.slug} --><div class="drawing" data-ss-id="${v.slug}-drawing"><h2>${esc(v.name)}</h2><p>Being drawn…</p><i></i><i></i><i></i></div><!-- /part:${v.slug} -->
</section>
`).join("\n");
  const { at, lead } = afterLast(page, all);
  let out = page.slice(0, at) + lead + "\n" + sections + page.slice(at);
  // The parent's tokens, as each version's own rule, in the page's <style> that sets them last (a part's own
  // <style>, inside its direction, is left as it is).
  const sel = `[data-ss-id="direction-${p.slug}"]`, inside = directionsOf(out);
  let tokens = [], home = null;
  for (const st of out.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
    if (!inside.some((d) => st.index > d.start && st.index < d.end)) for (const r of st[1].replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]*)\{([^{}]*)\}/g))
      if (r[1].split(",").some((s) => s.trim() === sel)) {
        const decls = [...r[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+?)\s*(?:;|$)/g)].map((d) => `${d[1]}: ${d[2]};`);
        if (decls.length) { tokens = tokens.concat(decls); home = st.index + st[0].lastIndexOf("</style>"); }
      }
  if (home !== null) out = out.slice(0, home) + versions.map((v) => `  [data-ss-id="direction-${v.slug}"] { ${tokens.join(" ")} }\n`).join("") + out.slice(home);
  // A page made with an older starter gets the starter's switcher (the lines' rules are in it), so its phone tabs
  // follow the rounds.
  const kit = kitted(out);
  if (kit !== null) out = kit;
  if (!/\/\* rounds: start \*\//.test(out)) {
    const head = out.search(/<\/head>/i), style = out.indexOf("</style>");
    if (style < 0 || (head >= 0 && style > head)) return { error: "round: the page has no <style> in its <head> for the lines' rules" };
    out = out.slice(0, style) + baseHtml().match(/  \/\* rounds: start \*\/[\s\S]*?\/\* rounds: end \*\//)[0] + "\n" + out.slice(style);
  }
  const focused = withFocus(withLines(out), "all");
  if (focused === null) return { error: "round: the page has no <head> to put the canvas's focus in" };
  return { page: focused, parent: p, versions, tokens: home !== null };
}
if (cmd === "round") {
  const parent = plain("parent", argv[1]) || "", names = argv.slice(2).map((n) => plain("name", n).trim());
  if (!names.length || names.length > 5 || names.some((n) => !n)) { console.error('round: give the direction the versions come from, then each version\'s name, 1 to 5 of them: round night-watch "Bolder" "Quieter" "Wider"'); process.exit(2); }
  const page = read("work/index.html");
  if (page === null) { console.error("round: no work/index.html"); process.exit(2); }
  const made = rounded(page, parent.replace(/^direction-/, ""), names);
  if (made.error) { console.error(made.error); process.exit(2); }
  const frame = read("draw/frame.html"), framed = frame === null ? null : rounded(frame, made.parent.slug, names);
  if (framed && framed.error) { console.error(`${framed.error} (in draw/frame.html, the writer's frame)`); process.exit(2); }
  if (!rework(made.page) || (framed && !swap("draw/frame.html", framed.page))) process.exit(2);
  const list = made.versions.map((v) => v.name);
  const said = list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list.at(-1)}` : list[0];
  console.log(`round: ${said} under ${made.parent.label || made.parent.slug}, in a new row joined to it by lines (${made.versions.map((v) => v.slug).join(", ")}), ${made.tokens ? "each with its tokens" : `with no tokens: the page has no rule for [data-ss-id="direction-${made.parent.slug}"], so set each version's`}; the canvas shows every direction; nothing pushed`);
  process.exit(0);
}
// Its own space, only when the person asks for one in words: the page with that direction alone (its views with it),
// named after it, in a new private space. This space, its page and work/ stay as they are.
if (cmd === "copy") {
  const slug = (plain("direction", argv[1]) || "").replace(/^direction-/, ""), page = read("work/index.html");
  if (page === null) { console.error("copy: no work/index.html"); process.exit(2); }
  const all = directionsOf(page), d = all.find((x) => !x.view && x.slug === slug);
  if (!d) { console.error(`copy: give a direction on the page (${all.filter((x) => !x.view).map((x) => x.slug).join(", ") || "it has none"})`); process.exit(2); }
  let out = page;
  for (const x of all.slice().reverse()) if (x !== d && x.view !== slug) out = out.slice(0, x.start) + out.slice(x.end).replace(/^\n/, "");
  const name = (d.label || slug).replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  out = titled(out.replace(LINES, ""), name);
  out = withFocus(out, `direction-${slug}`) || out;
  const dir = `draw/_copy/${slug}`;
  if (within(dir)) fs.rmSync(dir, { recursive: true, force: true });
  mkdir(dir);
  if (!write(`${dir}/index.html`, out)) process.exit(2);
  let j;
  try { const r = run(["deploy", dir, "--title", name, "--json"]); j = JSON.parse(r.slice(r.indexOf("{"))); }
  catch (e) { console.error(`copy: the new space wasn't made: ${String(e.stderr || e.message || e).trim().split("\n").pop()}`); process.exit(1); }
  console.log(`copy: ${name} alone in a new space, private: ${(j.space || {}).url || (j.space || {}).id}; this space is as it was`);
  process.exit(0);
}
if (cmd === "push") {
  nameParts();
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
const crc32 = require("zlib").crc32 || ((b) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; }); // Node < 22.2
// Why bytes aren't a whole PNG a person can look at, or null when they are: the signature, every chunk's
// length and CRC, IHDR first and well formed, image data that inflates to exactly what that size needs with
// a known filter on every row, and IEND. Only the one form the renderer sends and this file can read is taken:
// 8-bit RGB or RGBA, not interlaced. Any other form is refused by name, even a valid one.
function pngBad(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "not a PNG";
  let pos = 8, head = null, end = false;
  const idat = [];
  while (pos < buf.length && !end) {
    if (pos + 12 > buf.length) return "cut short";
    const len = buf.readUInt32BE(pos), kind = buf.toString("latin1", pos + 4, pos + 8);
    if (pos + 12 + len > buf.length) return "cut short";
    if (buf.readUInt32BE(pos + 8 + len) !== crc32(buf.subarray(pos + 4, pos + 8 + len))) return `a damaged ${kind} chunk`;
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (!head && kind !== "IHDR") return "a PNG without its header first";
    if (kind === "IHDR") head = data; else if (kind === "IDAT") idat.push(data); else if (kind === "IEND") end = true;
    pos += 12 + len;
  }
  if (!end) return "a PNG without its end";
  const w = head.length === 13 ? head.readUInt32BE(0) : 0, h = head.length === 13 ? head.readUInt32BE(4) : 0;
  if (!w || !h || head[10] || head[11] || head[12] > 1) return "a PNG with an unreadable header";
  const ch = { 2: 3, 6: 4 }[head[9]];
  if (head[8] !== 8 || !ch) return `a PNG at ${head[8]} bits, colour type ${head[9]}: only 8-bit RGB or RGBA is taken`;
  if (head[12]) return "an interlaced PNG: only one that isn't is taken";
  if (!idat.length) return "a PNG with no image";
  let raw;
  try { raw = require("zlib").inflateSync(Buffer.concat(idat)); } catch { return "a PNG whose image won't unpack"; }
  const row = w * ch + 1;
  if (raw.length !== h * row) return "a PNG whose image is the wrong size";
  for (let y = 0; y < h; y++) if (raw[y * row] > 4) return "a PNG with an unknown row filter";
  return null;
}
// A phone picture is one strip, often 6,000 px tall, which shrinks to a sliver when viewed whole: cut it into
// columns at most 1,400 px tall, side by side, so it reads near full size. 8-bit RGB or RGBA PNGs only.
function columns(file, tall = 1400, gap = 24) {
  const zlib = require("zlib"), buf = fs.readFileSync(file), idat = [];
  let w = 0, h = 0, type = -1, pos = 8;
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString("latin1", pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[8] === 8 && !data[12] ? data[9] : -1; }
    else if (kind === "IDAT") idat.push(data);
    else if (kind === "IEND") break;
    pos += 12 + len;
  }
  const bpp = { 2: 3, 6: 4 }[type];
  if (!bpp || h <= tall) return;
  const raw = zlib.inflateSync(Buffer.concat(idat)), row = w * bpp, px = Buffer.alloc(h * row);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (row + 1)], src = raw.subarray(y * (row + 1) + 1), at = y * row;
    for (let x = 0; x < row; x++) {
      const a = x >= bpp ? px[at + x - bpp] : 0, b = y ? px[at - row + x] : 0, c = y && x >= bpp ? px[at - row + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      px[at + x] = src[x] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
    }
  }
  const n = Math.ceil(h / tall), W = n * w + (n - 1) * gap, line = W * bpp + 1, out = Buffer.alloc(tall * line, 0xdd);
  for (let y = 0; y < tall; y++) {
    out[y * line] = 0;
    for (let i = 0; i < n; i++) if (i * tall + y < h) px.copy(out, y * line + 1 + i * (w + gap) * bpp, (i * tall + y) * row, (i * tall + y + 1) * row);
  }
  const chunk =(kind, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(kind, 4, "latin1"); data.copy(b, 8); b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
  const head = Buffer.alloc(13); head.writeUInt32BE(W, 0); head.writeUInt32BE(tall, 4); head[8] = 8; head[9] = type;
  fs.writeFileSync(file, Buffer.concat([buf.subarray(0, 8), chunk("IHDR", head), chunk("IDAT", zlib.deflateSync(out)), chunk("IEND", Buffer.alloc(0))]));
}
if (cmd === "save" && !bg) {
  if (!argv[1]) { console.error('save: give a message, e.g. save "Three directions" "All three are up"'); process.exit(2); }
  const j = launchable("save", "save");
  if (j.state === "open") { console.error(`save: the last save (run ${j.id}) may still be running: ${j.why}. Nothing started; fold.js wait shows when it ends`); process.exit(1); }
  if (!work()) process.exit(2);
  nameParts();
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
  process.on("exit", () => ack("save", "ended"));
  const say = (l) => console.log(`${new Date().toISOString().slice(11, 19)} ${l}`);
  const end = (l) => { say(l); ack("save", l); };
  (async () => {
    if (job("writer").state !== "open") {
      const f = foldOnce("before the save");
      if (f.refused) return end(`save failed: ${f.refused}`);
      if (f.line) say(f.line);
    }
    // A page from before the canvas area gets it now, with the starter's switcher, so this save puts it on the canvas.
    for (const f of ["work/index.html", "draw/frame.html"]) {
      const p = read(f);
      if (p === null || areaed(p) === p) continue;
      if (f === "work/index.html" ? rework(kitted(p) || areaed(p)) : swap(f, kitted(p) || areaed(p))) say(`${f}: its directions are now in the canvas area, in place of the whole-page canvas meta`);
    }
    const sent = read("work/index.html") || "";
    const d = deploy(argv[1]);
    if (!d.ok) return end(unsaved(d));
    card("down");
    say(`saved: ${d.lines.filter((l) => /Updated|Created|Merged|⇄|^Saved as version/.test(l)).join(" ") || "ok"}`);
    // Every push must happen, or the save didn't do what it says: it ends "incomplete", never "done".
    // The status first: a deploy takes the page's work card down as done, so mid-run it goes straight back up.
    // The page goes again only if it changed during the upload (a writer's push): the same page again would
    // only mark the saved version live.
    let missed = 0;
    const one = drawnInOneGo(read("work/index.html"));
    if (one) say("no part's status reached the person: the directions were drawn in work/index.html, not as parts (SKILL.md, order of work, steps 2 to 4), so this status names them");
    const status = one ? `${one}${argv[2] ? `. ${argv[2]}` : ""}`.slice(0, 200) : argv[2];
    if (status) say(push("--status", status) ? `status: ${status}` : (missed++, "status push didn't happen (draw/fold.log)"));
    const now = read("work/index.html") || "";
    if (now !== sent) say(push("--html", now) ? "pushed the page again: it changed during the save" : (missed++, "page push didn't happen (draw/fold.log)"));
    if (lost) return end(`save stopped: ${lost}`);
    if (missed) return end(`save incomplete: saved, but ${missed === 1 ? "a push" : `${missed} pushes`} didn't happen`);
    if (argv[3] !== "pictures") return end("save done");
    // Each whole direction at 1440 and at 390 px wide, from the page with ?ss-check: the starter's script then
    // measures the direction as it is drawn, and each layout fault comes back named in the picture's answer.
    // A device view (data-view-of) is drawn for one width, its frame's, so it gets that one picture.
    const saved = read("work/index.html") || "";
    const slugs = [...new Set([...saved.matchAll(/data-ss-id="direction-([a-z0-9-]+)"/g)].map((m) => m[1]))];
    const sizes = new Map();
    for (const [tag, d] of saved.matchAll(/<section\b[^>]*data-ss-id="direction-([a-z0-9-]+)"[^>]*>/g)) {
      if (sizes.has(d) || !/\sdata-view-of="[^"]+"/.test(tag)) continue;
      const f = (tag.match(/\sdata-ss-frame="([^"]*)"/) || [])[1] || "";
      sizes.set(d, [{ phone: 390, tablet: 820 }[f] || Math.min(Math.max(+(f.match(/^(\d{3,4})x\d+$/) || [])[1] || 390, 320), 1920)]);
    }
    const widths = (d) => sizes.get(d) || [1440, 390];
    const faults = new Map(), notes = new Set();
    // A page without the starter's script (written whole, or a person's own page) has nothing to measure it.
    if (slugs.length && !saved.includes("ss-fault/")) notes.add("layout not measured: the page doesn't carry the starter's check script, so no fault can be reported; look at each picture closely");
    const KIND = { narrow: "words run under 4 characters a line", wide: "runs past the direction's edge", cut: "words cut off by the box around them",
      redraw: "a live push puts it back as the source has it, and nothing draws it again: build it in the function the script runs with ssDraw" };
    const shot = async (d, w) => {
      const f = `${d}-${w}.png`;
      if (!within(f)) { refuse(f); say(`picture ${f} refused: it is a link`); return false; }
      remove(f); // an earlier save's picture never stands in for this one
      for (let t = 1; t <= 2; t++) {
        const r = await runAsync(["spaces", "screenshot", space, "--path", "/?ss-check=1", "--width", String(w), "--height", String({ 390: 844, 820: 1180 }[w] || 1000), "--section", `direction-${d}`, "--json"]);
        let a = null;
        try { a = JSON.parse(r.out.slice(r.out.indexOf("{"))); } catch {}
        const png = !r.e && a && typeof a.png === "string" ? Buffer.from(a.png, "base64") : null, bad = png && pngBad(png);
        if (png && !bad) {
          fs.writeFileSync(f, png);
          if (w === 390) try { columns(f); } catch (e) { say(`${f} kept as one strip: ${e.message}`); }
          for (const x of a.resource_failures || []) {
            const m = String(x.url || "").match(/\/ss-fault\/([a-z0-9-]+)\/(narrow|wide|cut|redraw)\/([^/?]+)\.png\?t=([^&]*)/);
            if (m && m[1] === d) faults.set(`${w} ${m.slice(1, 4).join(" ")}`, `fault at ${w} px: ${d}: ${decodeURIComponent(m[3])} "${decodeURIComponent(m[4])}": ${KIND[m[2]]}`);
            const u = String(x.url || "").match(/\/ss-note\/redraw-unmeasured\.png\?t=([^&]*)/);
            if (u) notes.add(`redraw not measured: ${decodeURIComponent(u[1])}; the pictures still count`);
          }
          say(`picture: ${f}`);
          return true;
        }
        say(`picture ${f} refused (try ${t}): ${bad ? `the answer's picture is ${bad}` : (r.err || r.out).trim().split("\n").slice(-1)[0].slice(0, 200)}`);
        await new Promise((ok) => setTimeout(ok, 5000));
      }
      return false;
    };
    const files = slugs.flatMap((d) => widths(d).map((w) => `${d}-${w}.png`));
    const shots = await Promise.all(slugs.flatMap((d) => widths(d).map((w) => shot(d, w))));
    for (const l of faults.values()) say(l);
    for (const l of notes) say(l); // not a fault: the save passes or fails on the rest
    // The last line says what to do, in its first words: a picture missing means save again; a layout fault
    // means fix it once in its part, then stop. The fix isn't measured again, so a second save can't help.
    const missing = files.filter((f, i) => !shots[i]);
    if (!files.length) return end("save done, no pictures: the page has no direction to picture"); // a deck or prototype: saving again can't change it
    if (missing.length) return end(`pictures incomplete: ${missing.length} of ${files.length} missing (${missing.join(", ")}), each refused above: fix that, then save again`);
    const n = faults.size;
    if (n) return end(`layout check failed: ${n} fault${n > 1 ? "s" : ""}, listed above: fix each once in its part, then fold.js stop; don't save again for them`);
    end(`pictures done: ${files.length} pictures, no layout faults`);
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
  // Success only for a save that did all it says: saved, pushed the page and status (and took every picture,
  // each a whole PNG, with no layout fault measured).
  process.exit(/^(save done|save done, no pictures: the page has no direction to picture|pictures done: \d+ pictures, no layout faults)$/.test(e.how) && !note.includes("refused") ? 0 : 1);
}
if (cmd === "write" && !bg) {
  const j = launchable("writer", "write");
  if (j.state === "open") { console.log(`a writer (run ${j.id}) may still be running: ${j.why}. Nothing started`); process.exit(0); }
  // A new build takes the frame from the page; a writer that stopped while idle keeps its frame.
  if (!here("draw/frame.html") || here("draw/stop")) {
    nameParts();
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
  if (f.refused) fail(f.refused);
  if (f.line) console.log(f.line);
  if (!argv[1]) {
    // Nothing to save: the last save is the design. The status it put back for the look at its pictures would
    // keep every open tab, and every tab opened later, saying the page is being worked on. Take the card down.
    if ((read("draw/card") || "").trim() === "down") process.exit(0);
    if (!push("--status", "")) fail("the push that takes the work card down was refused (draw/fold.log), so open tabs still say the page is being worked on: the page isn't reaching the space");
    console.log("took the work card down: open tabs no longer say the page is being worked on");
    process.exit(0);
  }
  const d = deploy(argv[1]);
  if (d.ok) card("down");
  console.log(d.ok ? d.lines.filter((l) => !/^[↑]/.test(l)).join("\n") : unsaved(d));
  process.exit(d.ok ? 0 : 1);
}

// The writer itself (`write` starts it in the background, as one run).
const me = job("writer");
if (me.id !== THIS_RUN) process.exit(2); // not the writer on record
DEADLINE = me.deadline;
log(`the writer started (run ${THIS_RUN})`);
process.on("exit", () => ack("writer", "ended"));
// The idle clock follows the inputs (the folded parts and frame), whatever the pushes did; five refused
// pushes in a row stop it too, so nobody draws on into a page that isn't reaching the space. A push no tab
// confirmed isn't refused: a person who switches to another tab mustn't stop the build.
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
  // The status first: after a save the person's work card waits 3 s for one, and a page push can take longer.
  if (page && page.status && page.status !== said && may() && tried(push("--status", page.status))) said = page.status;
  if (page && page.html !== shown && may()) {
    setWork(page.html);
    if (tried(push("--html", page.html))) shown = page.html;
  }
  sleep(1000);
}
log(`the writer stopped: ${how}`);
ack("writer", how); // the last act: no call to the CLI follows
process.exit(0);
