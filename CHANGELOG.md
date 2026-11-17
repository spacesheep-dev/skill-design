# Changelog

Each release is a heading with its tag. The release workflow uses the words under it as the release's notes.

## v1.2.23

- A save whose deploy the CLI calls failed now checks, as a save stopped at its time limit already did, whether a version with its message is newer than the space's newest before it. If one is, the deploy made it (only its answer was lost, for example when the server restarted mid-call), so the save is a save: it says `Saved as version N`, goes on to its status and pictures, and nothing says failed. If none is, the save ends with the CLI's own words, as before.
- One new test (a deploy that answers `deploy failed:` after its version is made, and one that made none): 63 tests, one skipped as before.
- The folder's hash is `b6171023c863`.

## v1.2.22

- Spacesheep no longer has a Design workspace, so the page no longer declares one: `<meta name="ss-workspace" content="design">` is gone from base.html and starter.html, and from the first version `start --new` puts up. `start` still knows a first version from before, with that meta, as a blank page.
- The frame's Tweaks pane no longer waits to be hidden by Spacesheep's own Tweaks: it is the design's Tweaks wherever the page opens. Its CSS drops the `[hidden]` checks that were only there for that, and its comments say so.
- SKILL.md names the starter's two metas, `ss-chat` and `ss-canvas`, and says the bar's Tweaks button opens the controls. references/after.md: values set in Tweaks stay in that tab until Keep these sends them to the chat; nothing saves them on close. An older page's `ss-style` rules from Spacesheep's Tweaks are still changed or removed with their token.
- `fold.js kit` adds no workspace meta, as before; an older page keeps its own, which nothing reads now.
- One new test case (an older first version is still blank) and two new checks (no workspace meta in the first version or the starter): 62 tests, one skipped as before.
- The folder's hash is `2b87dca2e00f`.

## v1.2.21

- The design's own bar has Export, the last pill in its row, outlined like Back; on a phone it is its icon alone, with a 44 px tap. Its menu has the four exports a design had in Spacesheep's workspace: a PDF of one direction, a PDF of every direction, that direction as one HTML file, and a prompt for a coding agent. The one-direction items are for the direction open full page, else the chosen one, else the one the tabs show, and each names it.
- PDFs come from Spacesheep, not the page: each PDF item carries `data-ss-pdf` with the sections' `data-ss-id`, filled when the menu opens, and the viewer makes one sheet per direction at its own size, in page order. A refusal's why is said beside Export.
- HTML is made in the page from its own source: that direction alone, shown, with the person's Tweaks values, without the bar, the card menus, the round lines, `ss-` metas, or anything after the page's new end mark, `<!-- design: end -->`, which stays the body's last node.
- The prompt (sign in, read the space, build that section by its id, report what didn't match) is copied inside the tap, and says Copied only once it is; otherwise the prompt is shown to copy by hand.
- The menu takes the card menu's keys. `fold.js kit` brings Export and the end mark to an older page. SKILL.md's frame line names Export and asks for no download button of the design's own; the paper and flyer lines drop their Download PDF button. starter.html is made again from base.html.
- On staging, Spacesheep's PDF route given the PDF items' ids made one sheet for one direction and three, in page order, for every direction, each whole at its own size. The tap itself was checked in Chromium, Firefox and WebKit against a stand-in listener, not on staging.
- Tweaks' button is Keep these, one tap, where it was Copy for the chat. It carries the line `Keep these for <direction>: <Name> <value>, …` as `data-ss-say` and as its title, set again whenever a value or the shown direction changes and as the tap begins, so Spacesheep sends it to the chat as it does Use this's. A page opened outside Spacesheep, with no frame around it, still copies the line. SKILL.md reads the line as before.
- A chat button's `show-direction` action (`{"emit": {"name": "show-direction", "data": {"id": "direction-<slug>"}}}`) is handled by the page: the switcher opens the direction its id names, as its `#direction-<slug>` link does, and an id the page hasn't got changes nothing. It is in the switcher's script, so `fold.js kit` brings it to an older page.
- SKILL.md says `ss-workspace` adds Spacesheep's Tweaks; it no longer names a files bar.
- Three new tests (62 in all, one skipped as before).
- The folder's hash is `10b0f10a0399`.

## v1.2.20

- Each direction's card has a small ⋯ menu on its canvas label row, at the labels' own type and size, with two items: Use this (`Use <name>`) and Another round (`Another round of <name>`). Each sends its line to the chat through `data-ss-say`, as shown on the button. The chosen card reads `✓ Chosen ⋯`, and its Use this reads Chosen and can't be pressed again. On a touch screen ⋯ takes a 44 px tap.
- The menu works from the keyboard: Return, Space or ↓ on ⋯ opens it on its first item, ↑ and ↓ move with wrap-around, Esc closes back to ⋯ without leaving the open direction, and Tab closes it. A tap outside or on an item closes it.
- With a direction open full page, the bar shows Use this · Another round as one pill in two halves, one tap each, beside Back. It fits on Back's row at 390 px.
- A direction gets a space of its own only when the person asks for it in words: `fold.js copy <slug>` (new) deploys that direction alone, with its device views, as a new private space named after it. `work/` and the current space stay as they are. It is not a menu item.
- fold.js names each menu after its direction, and a round's versions get one. A page from an older starter keeps its lone pill, still renamed, with no menu put in.
- SKILL.md's pick, frame and rounds lines say the same. starter.html is made again from base.html.
- Two new tests (59 in all, one skipped as before).
- The folder's hash is `59d6e130d6c2`.

## v1.2.19

- Less code, the same pages: 146 lines of source come out of fold.js, check.js and the starter, with no change to what the skill makes.
- Parts are read only from `draw/<slug>/NN.html`, the form SKILL.md has taught since 14 Nov. fold.js and check.js no longer read the older single file (`draw/<slug>.html` with its `.status`), and a revision's read puts aside only a direction's frame and part folders.
- `fold.js round` takes the rounds' line rules from base.html, as `kit` already takes the switcher and check spans, so there is one copy and no test comparing two. base.html is read in one place, and only by the commands that need it.
- fold.js no longer writes `draw/<job>.pid`. Nothing read it: `draw/<job>.run` already holds the run's process group.
- The starter answers only to the kit's names, `.k-cards` and `.k-table`. The pre-kit `.cards` and `.stack` aliases are gone, and check.js's scroller message names the `k-` classes. Pages made before keep their own CSS, since `kit` replaces only the switcher and check spans. The chosen pill's rules are written once for the bar's pill and the cards' pills. starter.html is made again from base.html.
- `assets/switcher.html`, the old standalone switcher no step used, is gone, with its line in SKILL.md. Spacesheep's canvas check now starts from base.html.
- Three test assertions that pinned switcher source text go, each covered by a test that runs the script. Tests: 57 (56 pass, one skipped as before).
- The folder's hash is `bf47c368a70a`.

## v1.2.18

- A starter page Spacesheep can show at once. `spacesheep.yaml` names `assets/starter.html`: `base.html` without its directions, the same empty canvas `fold.js start` pushes on a blank page. A Spacesheep that takes the `starter` key shows it the moment Design is picked on a blank space, before the session has started, and `start`'s own push then changes nothing on screen. A space with no title now gets Untitled in its page (it was Design), as Spacesheep's starter does. A test fails if `starter.html` and `base.html` drift apart.
- More versions are a new round on the same canvas. `fold.js round <slug> "<Name>"…` (1 to 5 names) adds each version after the last direction. Each version gets its parent's frame and tokens, a pill and an empty part. They sit in a row of their own below everything, each joined to its parent by a line. The lines are one block behind the frames: 1.5 px at any zoom, stopping 24 px above each version's label, shown only on the canvas. Earlier rounds, and their comments, stay as they are. On staging, a comment pinned to a round 1 block stayed on it through two more rounds.
- On a phone, once a page has rounds, the tabs on the canvas are the newest round and the direction it came from. With eight frames the bar is 151 px of 844, where it was 250. The older ones stay on the canvas under their number keys, and one opened full page keeps its tab until Back. Without the canvas, and on a desktop, every tab shows. `round` numbers each round (`data-round`) and brings an older page's switcher up to date.
- A save pictures every direction, versions too. On staging, 6 pictures took 16 s, 12 took 32 s and 16 took 42 s.
- The chosen direction's ring is its frame's own edge (`outline-offset: 0`), 2 px at any canvas zoom, so it no longer runs through the canvas's label row.
- Seven new tests (57 in all, one skipped as before).
- The folder's hash is `642b92a710cb`.

## v1.2.17

- Use this design is quieter. A card's pill is a small outline chip in the canvas labels' type: 11 px mono, 24 px tall, with the number boxes' 1 px edge and 5 px corners, in the page's ink. On a touch screen it takes a 44 px tap without growing. The bar's pill is the same outline pill as Back, so the only filled thing in the bar is the open tab. Chosen keeps the outline and can't be pressed again.
- A pick from a Use this design pill carries no reason, so the reply asks once, in words, what made them pick it. An answer goes on the pick's Decisions line; nothing waits for it.
- Text on text. `check.js` flags display type set under line-height 1 with less than a fifth of its size clear above or below (margin and padding counted together; drop caps and floats aside). Its message says to give the type that room and keep its line-height. SKILL.md says a display stack must look right in every face it names, since a face the picture's renderer lacks can be taller, and the picture's look checks for text on text.
- One new test (50 in all, one skipped as before).
- The folder's hash is `a90bb6a4d426`.

## v1.2.16

- The starter's top bar is the frame, ready-made. While a direction is open full page it shows Back (`data-ss-canvas-back`, which the canvas takes; Esc too). It also has the tabs, Tweaks, and the zoom % in canvas view (`ss.canvas.zoom` and its `ss:canvas` event). There is no Reload button. The bar takes light or dark from the page's colour scheme, and its tabs wrap rather than being cut at a phone's width. In canvas view, with no direction open, no tab is filled.
- Use this design. Each direction's card has a pill on its canvas label row (`data-ss-canvas="label"`), and the bar has one while a direction is open. A tap opens the direction and sends Use <name> to the chat through `data-ss-say`. The chosen direction (`data-chosen`) has its edge and tab marked, and its pill says Chosen and can't be pressed again. fold.js names each pill after its direction.
- Faster start. `start` reads the page beside the space's details, puts its status up as soon as the id is known, and pushes a blank page's empty canvas the moment the read is back. SKILL.md's first line makes `start` the agent's first action. In one staging run, the empty canvas went up 19 s after the session got the ask (34 s before).
- The space's title is the person's. `start` keeps it in the page and says so, and step 2 no longer sets one. When it clearly doesn't fit the work, the agent asks once, at the end of its last reply: one question with three titles and Don't change, so a tap is the whole answer. `fold.js title` (new) renames the space and the page on the person's pick.
- Six prompt rules. Every direction shows the same real content, so the pick is about structure, not copy. An existing screen or mock shapes one direction only. Each direction's line says what it gives up, and the reply ends on one decision line. A big brief is narrowed to its most important screen, and the reply says what was left out. The Decisions log keeps the reason beside each pick and is read before new work. Dark mode is built when clearly wanted. When it's unclear, such as a venue open into the evening, the agent asks while light is drawn. Otherwise the page stays light. In a blind test against v1.2.15 (two people, two requests, one run each), rules 1, 2 and 6 were picked over v1.2.15, and nobody picked v1.2.15's designs.
- `check.js` passes the ids Spacesheep gives unmarked lines on save (`auto-<tag>-<hash>`), so a revision's check no longer fails on blocks the agent can't rename.
- Names and titles holding `$&`, `` $` `` or `$'` are written as they are.
- Seven new tests (49 in all, one skipped as before).
- The folder's hash is `7cb411fc95b4`.

## v1.2.15

- Phone and tablet views are part of the design. Spacesheep's Design bar no longer has a Desktop / Tablet / Phone switch. When the person asks for one ("the phone version", "responsive"), the session builds it as a frame of its own (`data-view-of="<slug>"`, `data-ss-frame="phone"` or `"tablet"`), after the last direction and drawn under its own on the canvas. Views are never built by default. The directions keep the canvas's numbers 1 to n, matching the tabs, and a direction's number key, pressed again, steps through its views and back.
- Each frame lays out at its own width. The starter's phone rules are `@container` rules, and the headline uses `5cqi`, not `5vw`. Before, a 390 px frame on a wide window got the wide layout, and a 1280 px frame on a phone got the phone layout.
- Without the canvas (the client copy), a direction with views gets Desktop / Phone (/ Tablet) buttons under the tabs, and a narrow window opens on the phone view. A one-design page keeps the switcher's script, so its buttons work too.
- A view gets one picture, at its frame's width (390 for a phone, 820 for a tablet).
- `fold.js kit` (new) brings a page made before views up to date: the switcher's styles and script, the device row, the container rules, and the layout check the save's pictures run. It changes nothing else, pushes nothing, and says "already current" when run again.
- A folder made before v1.2.0 has no `draw/writer.run` or `draw/save.run`, so `save` refused it. Now the next `start`, `read`, `kit`, `save`, `write`, `wait` or `stop` sets a missing record up as `none`, but only when no save, writer, deploy or live push for the space is running in that folder; otherwise the line names the process. A record is made only where none is, so one another command writes meanwhile is never replaced. In one recorded run on a pre-1.2.0 page, the phone view took 6:51 and one save, but the session wrote both records by hand and its pictures said "layout not measured".
- `check.js` flags a view without its direction's tokens, a `data-view-of` that names no direction, a view before a direction, and a direction's `@media` width rule or `vw` size.
- Twelve new tests (42 in all, one skipped as before), including a stand-in `ps` that writes a save's record while fold.js lists the processes. That one fails on a version that replaces the record.
- The folder's hash is `04e640de3111`.

## v1.2.14

- A session without the skill's folder now says what it is doing while it fetches the files. SKILL.md's "Getting this skill" asks, before the first file and when the person gave a space's link, for `npx -y spacesheep@latest live push --space <link> --status "Fetching the Design skill"`. fold.js's first status (`start` or `read`) replaces it. With no space yet there is nothing to show it on, so it is skipped. In one recorded revision the page said "Reading your request" for 72 s while the files were fetched; earlier runs that named the fetch did so on their own.
- One new test runs that command from SKILL.md against a stand-in CLI and checks what it sends. It fails on v1.2.13 (no such command).
- The folder's hash is `a7fcb4f823a3`.

## v1.2.13

- SKILL.md's command for fetching one of the skill's files now writes the whole file. The store sends about 40,000 characters a call, with `next_offset` saying where the next page starts (0 once the file has ended). The old command read one answer and wrote its text, so `assets/fold.js` (57,910 bytes) came out at 36,683 and `assets/base.html` (39,357 bytes) at 37,266. In one recorded run the first `fold.js` was cut, failed to run, and fetching the rest by hand took about 1.5 minutes. The new command asks with `--offset` from each answer until the file ends; checked against the store, both files come out byte for byte.
- SKILL.md arrives in pages too: `--view full` stops at about 29,300 characters of these words. The same line now says to fetch `SKILL.md` with that command when `--view full` shows a `next_offset` above 0.
- One new test runs the fetch command from SKILL.md against a stand-in CLI that serves 20,000-character pages, and checks fold.js, base.html and SKILL.md come out whole, one call a page. It fails on v1.2.12 (fold.js is cut).
- The folder's hash is `13af36f6b20c`.

## v1.2.12

- A revision's save sends the page as the session edited it. `fold.js read`, and `start <link>`, put the last build's frame and parts aside in `draw/_old/<time>/` (moved, not deleted), so nothing is left to fold over the page just read. Only a part's own files move (its folder of parts, or an older page's `<slug>.html` and `<slug>.status`), so a part named `space` or `old` leaves fold.js's files where they are. In one recorded run ("Make the Programme poster start at 3pm") the save folded the first build back over the edit and published the old 2pm times as a version of its own.
- A fold never goes over an edit made in `work/index.html`. `draw/work.sha` holds the page fold.js last put there. If the page was changed since and a fold would change it, `save` ends `save failed: work/index.html was changed after fold.js last wrote it…`, says where to make the change, and saves and pushes nothing; `stop` fails the same way. A folder from before this version keeps the old behaviour until its next read.
- A save pushes the page again only if `work/index.html` changed during the upload. Before, every save pushed the same bytes again after its deploy, and the viewer showed LIVE after each save and after the run.
- SKILL.md section 7: a revision's change and the "Keep these" values go in `work/index.html`. A change to a value a control sets changes the control: the option it opens on says the new value, the others still read as choices, and the brief's `control:` line changes with it.
- Four new tests: read, edit and save carries the edit (a later `write` and `stop` too), with the frame and part in `draw/_old/`; a read with parts named after fold.js's own files (`space`, `card`, `stop`, `starter`, `old`, `_old`) moves only the parts' files and the folder still saves; a save over a hand edit fails with nothing deployed or pushed; a save of an unchanged page makes no page push after the deploy, and one changed during the upload pushes the newer page. The first three fail on v1.2.11.
- The folder's hash is `6a9c3a6631b7`.

## v1.2.11

- A save fold.js stops at 60 s no longer ends with a bare `save failed:`. Before each deploy, fold.js notes the space's newest version. If the deploy is still running at its time limit, it reads the history again. The save counts as saved only if a version with its message is newer than that one: "Saved as version N. The server answered late: fold.js stopped the CLI at 60 s, after the version was made." It then goes on as usual (status, page push, pictures). In one recorded run the version existed 3 s into the deploy, the answer took 79 s, and the session saved a second time.
- There's no clock in that match, so an earlier version with the same message (an earlier save, or a retry) never passes for this one. Otherwise the save fails and says why: no new version with its message, or which history read failed and how. Saving again is safe: if the first one landed after all, the second makes no new version.
- A deploy that exits non-zero without printing anything now says how it ended (`the CLI ended (exit N) without saying why`), not an empty `save failed:`.
- `fold.js read` with no words says "Reading your design", not "Reading the page".
- Each save makes one extra history call before its deploy: about 0.5 s, at most 15 s.
- One new test hangs the stand-in CLI's deploy in five cases: landed (saved as version 2, then status and push), no new version with only an older one carrying the same message, history refused throughout, refused only before, and refused only after. On v1.2.10 the no-new-version case exits 0 with "Saved as version 1".
- The folder's hash is `2a2771351d98`.

## v1.2.10

- A revision says what will change before anything is read. `fold.js read "<what you'll change>"` puts that status on the page ("Making Big Day's 18 red"), then reads the current source into `work/`. Before, `read` pushed nothing, so after a person asked for a change the page said nothing until the save: 2 min 41 s in one recorded run. Without words it says "Reading the page". A refused push is said, and the read goes on.
- `fold.js start <link> "<status>"` takes the same words, for a revision in a folder that has no space yet. A new build still says "Reading your brief".
- SKILL.md section 7 opens every revision with that one command, and no longer asks for a status push fold.js couldn't make.
- One new test: start's and read's words are pushed before the source is read, read defaults to "Reading the page", the work card is up afterwards, and a status that starts with `-` is refused. It fails on v1.2.9.
- A save that fold.js stops at 60 s still reports "save failed", even when its version landed. That message changes in a later release.
- The folder's hash is `e9ea0585a301`.

## v1.2.9

- A pick keeps the other directions. "Go with the third" makes it the one the space opens on, points the canvas at it and records the pick in Decisions; the others stay, to compare or come back to. They are removed only when the person says so ("drop the others", "just that one").
- The Decisions log no longer shows on the canvas. The canvas draws any block outside a direction as a frame of its own, so the log appeared as a bare "Decisions" line over the first frame's top-left corner. It is now written `data-ss-canvas="pin" style="display:none"`: kept off the canvas and read from the source. `check.js` flags a log that would show, reading its tag as the browser does (spaces around "=", any quotes, the `display` that wins), and the hand-off copies its lines in.
- The switcher no longer writes the default direction into the address when the page loads. `ss-canvas-focus` decides what the canvas opens on, and the canvas took that written address as the person moving the view, then kept a zoomed-in view as the chat drawer narrowed the window. A tab click still writes it.
- Three new tests: an unpinned or visible Decisions log is flagged with its line (eight ways of writing it), a pinned and hidden one passes (three ways), and the starter's only address write is in its tab click.
- The folder's hash is `03bc0e9b61f9`.

## v1.2.8

- The canvas can follow the work. The starter carries `<meta name="ss-canvas-focus" content="all">`, and `fold.js focus <all|slug>` points it at every direction or at one (`direction-<slug>`). It sets the meta in `work/index.html` and in the writer's frame, then pushes the page; with a writer running, the writer pushes it. A slug that isn't one of the page's directions is refused, and nothing is changed or pushed. A page from before this version gets the meta beside its `ss-canvas` meta.
- The skill sets the focus as the work moves. While the person chooses, it shows every direction. When they pick one or ask for a change to one, it focuses that direction. When they ask for alternatives again, or a new direction is added beside it, it shows all again. "Go with the third" focuses the one left. The client copy drops the meta.
- Spacesheep's canvas opens the focused frame, or all of them, at load and whenever the meta changes, and a person's own pick in their tab holds until it changes again. Until the canvas reads the meta, nothing changes on screen.
- Three new tests: `focus` changes only the meta and pushes that page, and `all` puts it back; an unknown slug is refused with nothing pushed; a page without the meta gets it in `work/` and in the frame.
- The folder's hash is `9cf31cbb1d88`.

## v1.2.7

- `fold.js start <link>` lays down the starter on Spacesheep's own new page (sheep.new, or a space made with no page). That page is `<html data-ss-id="root">` with an empty `<body data-ss-id="body">`, and start used to count any `data-ss-id` as a design, so it skipped the starter there and the agent had to add it by hand. Blank now means the page's source is one of the few known to be empty, whatever its title: an empty file, Spacesheep's new page as it is stored, or `start --new`'s first version. Every other page is a design and is kept, so start never lays the starter over a page with anything on it. If the platform changes its new page, start reads it as a design and the starter is laid by hand, as before; a test that compares fold.js's copy with the platform's (`SPACESHEEP_SRC=<the spacesheep repo>`) catches that.
- A page with content but no `data-ss-id`, such as one written by hand, used to read as blank, and start put the starter over it. It is kept now.
- The starter's Tweaks button sits at the right end of the direction tabs' row. Spacesheep's comment button holds the page's bottom-right corner and covered it there in a tab that had watched a blank page being built. Open, its pane drops down from the button, over the directions without moving them. A one-design page keeps the nav while it holds Tweaks or the answers line.
- Two start tests: the four known empty pages get the starter, and fifteen other pages are kept. The fifteen include a head script, CSS `content` and `url()`, a `background` attribute, an outside stylesheet, any `.ss-*` element and words after `</body>`.
- Checked on staging and in the local viewer. One real poster run (`claude-opus-5-5`) went into a copy of sheep.new's page: start laid the starter, no starter was laid by hand, and each direction showed by name from 2:03, with the run ending at 4:30. Stills on that path (blank page open, then the design pushed in) at 1440 and 390: on v1.2.6 the comment button covers "Tweaks"; now the button sits in the tabs row clear of every control, and the open pane doesn't move the directions.
- The folder's hash is `d125fc644407`.

## v1.2.6

- fold.js names the starter's placeholders after their sections: `push`, `save` and `write` rename `part:first`, `part:second` and `part:third` (and the placeholder's id and heading) with the slug and name of the section holding them. Step 2's Edits now stop at the directions' tokens and each section's opening tag, so they never reach a placeholder, and the directions are drawn as parts, each with its own status.
- `start` says the next step when the starter is in `work/`: leave the placeholders, push, the Frame save, `write`, then each direction as `draw/<slug>/01.html`.
- A new build saved with no part marker left was drawn straight into `work/index.html`. Its status names the directions ("Sunny Bunting, Stacked Type and Long Table are up. Checking details"), and `draw/save.log` says no part's status reached the person. A revision of a space that already held a design keeps the save's own status.
- Three new tests: the next step and the renaming (nothing else in the page changes), the one-go status and its log line, and the parts and revision cases keeping the save's own status.
- Checked in one real poster run on staging, with a tab open from the start: the agent left the placeholders, saved the Frame ("Drawing three directions"), started the writer and wrote one part per direction. The tab showed five statuses: reading the brief, drawing three directions, the three directions by name, "All three are up. Checking details", then the work card gone. All three posters showed 68 s after the start, and the run ended at 88 s. A run on v1.2.5 that drew in one go showed two statuses.
- The folder's hash is `b3c15489be34`.

## v1.2.5

- The starter's scripts run again after a live push in a tab that was already open. A push that changes a script swaps the page in the same window, so its scripts run a second time, and a name a script declared at its top with `const`, `let` or `class` was declared twice: the browser skipped that whole script. The switcher shared a script with two such names, so a tab open from the first version never drew the direction tabs. They are functions now.
- `check.js` flags a direction's script that declares a name at its top with `const`, `let` or `class`, names it, and says to put the code inside `(() => { … })();`. It runs each script twice in an empty context behind a first line that throws, so the names are declared and none of the code runs. Helpers are told the same.
- A new test pins the check: `const`, `let` and `class` flagged; names inside a function, an arrow or a block passed, and so are top-level functions and `var`; the starter passes; v1.2.4's lines fail.
- Checked in headless Chrome 157 by swapping pages into one window as a live push does (`document.open`, `write`, `close`): the short first version, the starter, the starter with three directions drawn as parts and two controls, then a push that changes a script and a tab's name. With v1.2.4 the tabs bar was empty after the second swap and the third, and the browser reported `ssControls` already declared. With this version it showed the new names after both, the controls ran, and no error was reported.
- The folder's hash is `b680dfb405e5`.

## v1.2.4

- `fold.js stop` with no message takes the work card down. Before, it exited before calling the CLI, so a run that finished with nothing to fix left open tabs saying "spacesheep is working on this page" for minutes. It now waits for the save and the writer to settle, then sends an empty status. A refused clear fails the step, and a second `stop` sends nothing.
- The directions are drawn only as parts, each with its own status. The skill keeps each section's placeholder in `work/index.html` and never draws a direction there, so the person sees the build move. A run that drew straight into the page sent two statuses in 85 seconds. The same poster ask, run again on staging from this version, kept the placeholders and sent five statuses in 1:28, never more than 33 seconds apart.
- Checked with a stand-in CLI in the tests: start, a background save, wait, then `stop` with no writer and no message sends `{space, status:""}`. Then by hand on staging, the same steps with a tab open on the page: the card came down when the empty status went out.
- The folder's hash is `bd8487db239c`.

## v1.2.3

- On Spacesheep's canvas, the starter's Tweaks pane stays pinned to the screen's bottom corner, like the direction tabs, instead of being laid out over the first direction. Before, it covered the first direction's heading in the page, its screenshot, a shared link and its gallery card.
- The pane starts closed, as a small Tweaks button. Its corners are 8 px.
- Open, the pane is at most half the screen's height and its controls scroll under a fixed Tweaks heading. Without the cap, six controls on a 390 px phone reached above the screen's middle, and the canvas took the pane for a header and squeezed the directions under it.
- Checked with staging's screenshots at 1440 and 390: closed, and open with two and with six controls.
- The folder's hash is `1ec86f364132`.

## v1.2.2

- A new space's first version is a short page saying the design is being drawn, not the 38 KB starter, which stays in the folder. Before, a small design such as a notice was refused for cutting the page to a fraction of the starter, and the agent then published another way, skipping the pictures and the layout check.
- A save the platform refuses on purpose ends `save refused: <why>`. Nothing was saved and saving again can't help, so the agent tells the person why in one line and stops. The refusal's own advice to publish another way is left out, and the skill says never to make a version except through `fold.js save` or `stop`.
- A notice gets three directions, like a flyer or a poster: "one page" or "one A4 sheet" is its size, not how many designs. One design keeps the starter too, with one section, so its layout check still runs.
- A page without the starter's check script says its layout wasn't measured, rather than passing with no faults.
- The writer sends a part's status before the page, because the work card waits 3 seconds for a status after a save and a page push can take longer. On staging, every save had its status within 2.63 seconds.
- Run again on staging with the notice ask that was refused: five versions, all through `fold.js save` and `stop`, three directions, and the layout check passed after one round of fixes.
- The folder's hash is `aa3e83da9194`.

## v1.2.1

- The helpers start in the same message as the frame, so the first direction's top goes up sooner. Before, they started only after the frame was pushed and saved, 1:20 later in a measured run.
- Measured on the bench, with the same ask and the same answers to its questions: the first direction's top went up 2:25 after the answer (3:20 on v1.2.0), and the final save came at 4:58 (6:26). Of the 2:25, 0:38 is the bench's own wake and re-read, which a person's chat doesn't have.
- A helper's prompt is a few lines: the direction, the facts and the answers. Its standing rules moved to `references/helper.md`, which it reads.
- A save puts the status back straight after the version, then pushes the page again. Before, the page went first, so the work card could say "Done" for a few seconds mid-run.
- A push no tab confirms in time no longer stops the build. A tab behind another one can't confirm within the platform's wait, and a tab in front sometimes misses it too: six in a row in one measured run. The writer counted those as refused, so five in a row stopped it, and a save ended "incomplete". Now they count as sent. Any other refusal still counts.
- A part a direction's script hides stays hidden, even when the direction gives it a display of its own, such as a grid row. Before, a filter could hide rows that stayed on screen.
- v1.2.0's known gap is fixed on Spacesheep's side, with no change to the skill: a live push on the canvas keeps each direction in place, so drawn parts and controls stay. Staging has it now; production gets it with its next release.
- The folder's hash is `dc16699e5817`.

## v1.2.0

- The page fills in as the design is built: the frame and each direction's top go up first, helpers draw the directions at once, and one writer folds their parts into the space (`assets/fold.js`).
- Directions start from a kit of finished parts (`assets/base.html`), with colour in checked pairs.
- A new or vague brief gets a few questions first, as one chat form whose `pick` is the skill's own (`references/questions.md`). A run told not to wait, or one nobody can answer, builds on its best guesses.
- Up to six controls sit beside the design, drawn by Spacesheep's Tweaks. At least two are a switch or choice taken from the questions' other answers. They replace `assets/tweaks.html`.
- A save pictures each whole direction at 1440 and 390 px, and fails on layout faults, cut-off content or a bad picture (`assets/check.js`).
- The direction tabs survive a link with a malformed `#` part and a direction with no name; before, either one hung the page. They also come back after a live push on the canvas, which left them empty, and a direction id like `direction-%41` selects itself.
- A direction's script builds what it shows (cards, rows, lists, counts) in one function run with `ssDraw(fn)`, which draws it again after every live push. Before, a push left those parts empty until a reload. The save's check pushes the page into itself and fails a direction whose words, parts or their order change.
- Known gap: in an open tab, while the design is still being built, what a direction's script drew can go missing, and its tabs, filters and buttons can stop responding, until a reload or the next save. A live push on the canvas puts a fresh copy of each direction in place of the one on the page; the fix is Spacesheep's.
- Needs Spacesheep's chat forms with `pick` and Tweaks' switches and choices.
- The folder's hash is `7cb11305ecab`.

## v1.1.0

- Design reviews sit on Spacesheep's canvas: a design adds `<meta name="ss-canvas" content="on">` and marks each direction with `data-ss-frame`. The directions sit side by side, with pan, zoom and Fit.
- The direction tabs stay pinned above the canvas (`data-ss-canvas="pin"`), and the directions sit in one level row.
- A client copy drops the canvas meta, shows one direction at a time, and prints only the selected one.
- The folder's hash is `c194d2581770`.

## v1.0.0

- Moved out of the app's repo, with its history. The words are unchanged: the folder's hash is `07c4e6a3bed3`.
