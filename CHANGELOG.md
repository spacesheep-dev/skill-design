# Changelog

Each release is a heading with its tag. The release workflow uses the words under it as the release's notes.

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
