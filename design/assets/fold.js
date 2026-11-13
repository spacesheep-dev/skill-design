#!/usr/bin/env node
// The page's only writer, so one agent or several helpers can draw one page part by part. Each
// part is a file, draw/<slug>/<NN>.html, written whole with an agent's Write tool (no shell), its
// first line `<!-- status: Night Watch: prices -->`. The loop folds each direction's parts, in name
// order, into draw/frame.html between the markers `<!-- part:<slug> -->` and `<!-- /part:<slug> -->`,
// writes work/index.html, and pushes the page and the status whenever they change. A file changed in
// the last 300 ms waits for the next pass, so a part is never folded half-written. A direction keeps
// its placeholder below its parts until they show 40 characters of text, so a first part of styles
// alone, or a bare top bar, never blanks it. (Older pages: draw/<slug>.html ending with
// `<!-- end <slug> -->`, its status in draw/<slug>.status.)
//
//   node fold.js start <link>                    step 1: a status on the space, its id printed, its source in work/
//   node fold.js <space-id> &                    the loop, from the folder holding work/ and draw/
//   node fold.js add <slug> "<status>" < part    the same as writing the next draw/<slug>/<NN>.html
//   node fold.js push <space-id>                 push work/index.html once (the save line)
//   touch draw/pushnow                           push the page again (after a save lands)
//   touch draw/stop                              stop (it also stops after 30 minutes)
const fs = require("fs");
const { execFileSync, execSync } = require("child_process");

let space = process.argv[2];
if (!space) {
  console.error('usage: node fold.js start <link>   or   node fold.js <space-id>   or   node fold.js add <slug> "<status>" < part.html   or   node fold.js push <space-id>');
  process.exit(2);
}
// Write whole files only (a temporary copy in draw/, then a rename), so no reader sees half of one.
const swap = (f, text) => { const t = `draw/.${f.replace(/\//g, "_")}.tmp`; fs.writeFileSync(t, text); fs.renameSync(t, f); };
if (space === "add") {
  const slug = process.argv[3];
  if (!/^[a-z0-9-]+$/.test(slug || "")) { console.error("add: the slug is lowercase letters, digits and dashes"); process.exit(2); }
  const part = fs.readFileSync(0, "utf8").trim();
  fs.mkdirSync(`draw/${slug}`, { recursive: true });
  const n = fs.readdirSync(`draw/${slug}`).filter((f) => /^\d+\.html$/.test(f)).length + 1;
  const file = `draw/${slug}/${String(n).padStart(2, "0")}.html`;
  swap(file, (process.argv[4] ? `<!-- status: ${process.argv[4]} -->\n` : "") + part + "\n");
  console.log(`${file}: ${part.length} bytes`);
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

if (space === "start") {
  // Step 1 in one call, so the skill needs no shell substitution: a status on the link, the space's
  // id (the line `id: ...` of `spaces get`), and its source read into work/ by that id.
  const link = process.argv[3];
  const run = (args) => execFileSync(cli[0], [...cli.slice(1), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60000 });
  try { run(["live", "push", "--space", link, "--status", "Reading your brief"]); }
  catch (e) { console.error(`status refused: ${String(e.stderr || e.message).trim().slice(0, 200)}`); }
  const id = ((run(["spaces", "get", link]).match(/^ *id: (.*)$/m) || [])[1] || "").trim();
  if (!id) { console.error(`start: no id in the answer to spaces get ${link}`); process.exit(1); }
  process.stdout.write(run(["read", id, "-o", "work"]));
  console.log(`space: ${id}`);
  process.exit(0);
}
if (space === "push") {
  // Once, from the save line: a save lands behind the newest push, so push the page again.
  space = process.argv[3];
  const ok = push("--html", fs.readFileSync("work/index.html", "utf8"));
  console.log(ok ? `pushed ${fs.statSync("work/index.html").size} bytes` : "push refused: see draw/fold.log");
  process.exit(ok ? 0 : 1);
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
