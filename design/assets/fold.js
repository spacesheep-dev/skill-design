#!/usr/bin/env node
// The page's only writer, so one agent or several helpers can draw one page part by part. Each
// direction's parts collect in draw/<slug>.html (ending with the line `<!-- end <slug> -->`), its
// status in draw/<slug>.status. The loop folds those files into draw/frame.html, between the
// markers `<!-- part:<slug> -->` and `<!-- /part:<slug> -->`, writes work/index.html, and pushes
// the page and the status whenever they change. A file caught half-written (no end line) is
// skipped and the last whole copy is used, so the page never steps back.
//
//   node fold.js <space-id> &                    the loop, from the folder holding work/ and draw/
//   node fold.js add <slug> "<status>" < part    add a part above the end line, set the status
//   node fold.js push <space-id>                 push work/index.html once (the save line)
//   touch draw/pushnow                           push the page again (after a save lands)
//   touch draw/stop                              stop (it also stops after 30 minutes)
const fs = require("fs");
const { execFileSync, execSync } = require("child_process");

let space = process.argv[2];
if (!space) {
  console.error('usage: node fold.js <space-id>   or   node fold.js add <slug> "<status>" < part.html   or   node fold.js push <space-id>');
  process.exit(2);
}
// Write whole files only (a temporary copy in draw/, then a rename), so no reader sees half of one.
const swap = (f, text) => { const t = `draw/.${f.replace(/\//g, "_")}.tmp`; fs.writeFileSync(t, text); fs.renameSync(t, f); };
if (space === "add") {
  const slug = process.argv[3];
  if (!/^[a-z0-9-]+$/.test(slug || "")) { console.error("add: the slug is lowercase letters, digits and dashes"); process.exit(2); }
  const part = fs.readFileSync(0, "utf8").trim();
  const file = `draw/${slug}.html`, end = `<!-- end ${slug} -->`;
  fs.mkdirSync("draw", { recursive: true });
  const was = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : end + "\n";
  const at = was.lastIndexOf(end);
  const now = at < 0 ? `${was.trimEnd()}\n${part}\n${end}\n` : `${was.slice(0, at)}${part}\n${end}\n`;
  swap(file, now);
  if (process.argv[4]) swap(`draw/${slug}.status`, process.argv[4] + "\n");
  console.log(`${slug}: ${now.length} bytes`);
  process.exit(0);
}
// The CLI: one on the PATH, else npx's copy found once (a push then takes about 0.5 s, not 3).
let cli = ["npx", "-y", "spacesheep@latest"];
for (const find of ["command -v spacesheep", "npx -y -p spacesheep@latest -c 'command -v spacesheep'"]) {
  try {
    const bin = execSync(find, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (bin) { cli = [bin]; break; }
  } catch {}
}

const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const log = (line) => { fs.mkdirSync("draw", { recursive: true }); fs.appendFileSync("draw/fold.log", `${new Date().toISOString()} ${line}\n`); };

// The page goes through stdin, as JSON to the push_live tool: no argument limit (Linux refuses one over 128 KB).
function push(flag, value) {
  const html = flag === "--html";
  try {
    execFileSync(cli[0], [...cli.slice(1), ...(html ? ["call", "push_live", "-"] : ["live", "push", "--space", space, flag, value])],
      { input: html ? JSON.stringify({ space, html: value }) : "", stdio: ["pipe", "ignore", "pipe"], timeout: 20000 });
    return true;
  } catch (e) {
    log(`${flag} refused: ${String(e.stderr || e.message).trim().slice(0, 300)}`);
    return false;
  }
}

if (space === "push") {
  // Once, from the save line: a save lands behind the newest push, so push the page again.
  space = process.argv[3];
  const ok = push("--html", fs.readFileSync("work/index.html", "utf8"));
  console.log(ok ? `pushed ${fs.statSync("work/index.html").size} bytes` : "push refused: see draw/fold.log");
  process.exit(ok ? 0 : 1);
}

const good = {};
function fold() {
  const frame = read("draw/frame.html");
  if (!frame) return null;
  const statuses = [];
  const html = frame.replace(/<!-- part:([a-z0-9-]+) -->([\s\S]*?)<!-- \/part:\1 -->/g, (m, slug, inner) => {
    const part = read(`draw/${slug}.html`);
    if (part && part.trimEnd().endsWith(`<!-- end ${slug} -->`)) good[slug] = part;
    const status = (read(`draw/${slug}.status`) || "").trim().split("\n")[0];
    if (status) statuses.push(status);
    return `<!-- part:${slug} -->${good[slug] ?? inner}<!-- /part:${slug} -->`;
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
