# Changelog

Each release is a heading with its tag. The release workflow uses the words under it as the release's notes.

## v1.2.0

- The page fills in as the design is built: the frame and each direction's top go up first, helpers draw the directions at once, and one writer folds their parts into the space (`assets/fold.js`).
- Directions start from a kit of finished parts (`assets/base.html`), with colour in checked pairs.
- A new or vague brief gets a few questions first, as one chat form whose `pick` is the skill's own (`references/questions.md`). A run told not to wait, or one nobody can answer, builds on its best guesses.
- Up to six controls sit beside the design, drawn by Spacesheep's Tweaks. At least two are a switch or choice taken from the questions' other answers. They replace `assets/tweaks.html`.
- A save pictures each whole direction at 1440 and 390 px, and fails on layout faults, cut-off content or a bad picture (`assets/check.js`).
- Needs Spacesheep's chat forms with `pick` and Tweaks' switches and choices.
- The folder's hash is `d732283669b1`.

## v1.1.0

- Design reviews sit on Spacesheep's canvas: a design adds `<meta name="ss-canvas" content="on">` and marks each direction with `data-ss-frame`. The directions sit side by side, with pan, zoom and Fit.
- The direction tabs stay pinned above the canvas (`data-ss-canvas="pin"`), and the directions sit in one level row.
- A client copy drops the canvas meta, shows one direction at a time, and prints only the selected one.
- The folder's hash is `c194d2581770`.

## v1.0.0

- Moved out of the app's repo, with its history. The words are unchanged: the folder's hash is `07c4e6a3bed3`.
