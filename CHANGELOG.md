# Changelog

Each release is a heading with its tag. The release workflow uses the words under it as the release's notes.

## v1.2.1

- The helpers start in the same message as the frame, so the first direction's top goes up sooner. Before, they started only after the frame was pushed and saved, 1:20 later in a measured run.
- A helper's prompt is a few lines: the direction, the facts and the answers. Its standing rules moved to `references/helper.md`, which it reads.
- A save puts the status back straight after the version, then pushes the page again. Before, the page went first, so the work card could say "Done" for a few seconds mid-run.
- A page open in a tab behind another one no longer stops the build. Such a tab can't confirm a push within 2 s, and the writer counted that as a refused push: five in a row stopped it, and a save ended "incomplete". Now that answer counts as sent. Any other refusal still counts.
- The folder's hash is `70230b36fafd`.

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
