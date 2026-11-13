#!/usr/bin/env node
// Lets helpers draw one page at once. Each helper writes only draw/<slug>.html (its direction,
// ending with the line `<!-- end <slug> -->`) and draw/<slug>.status (one line). This loop is the
// page's only writer: it folds the helpers' files into draw/frame.html, between the markers
// `<!-- part:<slug> -->` and `<!-- /part:<slug> -->`, writes work/index.html, and pushes the page
// and the status whenever they change. A file caught half-written (no end line) is skipped and the
// last whole copy is used, so the page never steps back.
//
//   node fold.js <space-id> &      run from the folder holding work/ and draw/
//   touch draw/pushnow             push the page again (after a save lands)
//   touch draw/stop                stop (it also stops after 30 minutes)
const fs = require("fs");
const { execFileSync, execSync } = require("child_process");

const space = process.argv[2];
if (!space) {
  console.error("usage: node fold.js <space-id>");
  process.exit(2);
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
const log = (line) => fs.appendFileSync("draw/fold.log", `${new Date().toISOString()} ${line}\n`);

function push(flag, value) {
  try {
    execFileSync(cli[0], [...cli.slice(1), "live", "push", "--space", space, flag, value],
      { stdio: ["ignore", "ignore", "pipe"], timeout: 20000 });
    return true;
  } catch (e) {
    log(`${flag} refused: ${String(e.stderr || e.message).trim().slice(0, 300)}`);
    return false;
  }
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
    fs.writeFileSync("draw/.index.tmp", page.html);
    fs.renameSync("draw/.index.tmp", "work/index.html");
    if (push("--html", page.html)) {
      shown = page.html;
      if (again) fs.rmSync("draw/pushnow", { force: true });
    }
  }
  if (page && page.status && page.status !== said && push("--status", page.status)) said = page.status;
  sleep(1000);
}
