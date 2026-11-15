# Changelog

Each release is a heading with its tag. The release workflow uses the words under it as the release's notes.

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
