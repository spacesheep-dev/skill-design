---
name: design
description: Use when someone asks for a design to look at or click through, such as a mockup, landing page, one-pager, poster, flyer, clickable prototype, redesign, or "a few directions" to pick from, in their brand or a fresh look. It builds the design as a space they can open on a phone, comment on, approve and hand to a developer.
---

# Design

You make designs as spaces: one self-contained HTML document that the person opens on a phone, comments on block by block, approves, and hands to a developer. Spacesheep's own rules for a space still hold (Design Standards, mobile first, `data-ss-id` anchors, forms, slides and paper).

**The person watches the page fill in as you build it. Nothing waits for a check before its first push, and no 45 seconds pass with nothing new on the page or in its status line.**

**Your budget:** the first direction's top on the page by 2 minutes, every direction's by 4, finished and saved by 6. A choice you can revise later, make now and push.

**Getting this skill:** as a folder, everything is here. Otherwise, `npx -y spacesheep@latest skills get @spacesheep/design --view full` gives these words and the file list, and a file is fetched with `npx -y spacesheep@latest skills get @spacesheep/design --path <file> --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).file.text))' > <where>`. Read a reference only at the step that names it.

## Order of work

`<folder>` below is the folder you build in (it gets `work/` and `draw/`). You run two commands and no other, written in full in every call: `node <this skill's folder>/assets/fold.js -C <folder> <step>`, short `fold.js <step>` below, which talks to the one space it started with through the spacesheep CLI (its header lists each step), and `node <this skill's folder>/assets/check.js -C <folder>`, short `check.js`, which only reads. Read and search files with Read, Grep and Glob (never `cat`, `sed`, `awk` or `grep` in a command), and make and change them with Write and Edit: a new file is one Write call, a change one Edit call. Never `$(`, backticks, a heredoc, `sed`, or page text passed through a command: a permission check can't read them, and a person can't see what they allow. Without a shell (a Shepherd turn), take the same steps with your own tools.

1. **Start at once.** Before any command, say: "To draw this quickly I need three things from you, once: allow two commands (`fold.js`, which writes the page to your space, saves versions and takes pictures through the spacesheep CLI, downloading that CLI from npm if it isn't installed, and keeps a writer running in the background until the design is saved or five minutes after work stops; and `check.js`, which only reads the files here), and let me edit files in this folder without asking each time. After that it runs by itself. If you'd rather approve each step, say so and I'll go slower." Then, with the link the person gave, `fold.js start <link>` (without this skill's folder, fetch `assets/fold.js`, `assets/check.js` and `assets/base.html` first). It puts up a status, reads the space into `work` (the starter instead, if it holds no design) and keeps its id. With no space yet, `fold.js start --new "<working title>"`.
2. **Push the frame within 90 seconds,** having read only references/directions.md. From the brief alone, set the title and each direction's slug, name, line and tokens in `work/index.html` with two Edit calls in one message: the title, and the block from the directions' tokens to the last section (section 2 says how many): names and slugs are fixed from here. Push it, `fold.js push`, save it (`fold.js save "Frame" "Drawing three directions"`), and say in chat: "Three directions on the way: Harbour Chart, Night Watch, Logbook. Say if one is wrong." If an edit is refused, say in one line that you need edits allowed in this folder, and stop.
3. **Start the page's only writer:** `fold.js write`. It folds each direction's parts into `draw/frame.html` between its `<!-- part:<slug> -->` markers (rename them with the slug, or add them), writes `work/index.html` and pushes the page and status within 2 seconds of a change. It stops at `fold.js stop`, or by itself five minutes after the last change (so a closed session leaves it at most five minutes), and `fold.js write` starts it again. From now on nobody else pushes or edits `work/index.html`: change the frame, tokens included, in `draw/frame.html`. A part is one Write call, `draw/night-watch/01.html`, then `02.html` and on, its first line its status: `<!-- status: Night Watch: prices -->`.
4. **Draw at once.** With helpers you can start (subagents, parallel tasks), start one per direction now: the helpers, below. Otherwise send every direction's top yourself, from the brief, before any long thought; then read (step 5); then the rest, thought through once and sent as calls in one message with no checks between them, each direction top down. A helper that comes back refused or with no part: say once, "Helpers can't write here without your OK; drawing the directions myself", draw its direction yourself that way, and start no helper again. A part goes inside its direction's section, takes at most 45 seconds of writing, and every id in it starts with the slug.
5. **Read in one message while the tops go up,** with one status ("Reading Spark"): a Glob for the logo and the theme or layout files, a Grep for the nav labels and colour tokens, then Read on the two or three files they point to and one screen's worth of real rows. Use those tools, not `cd`, `ls`, `grep`, `cat` or `sed` in a command: each shell read is one more question for a person who approves each step. Stop when you have them. Put the tokens, and the logo once as a class every direction uses, in `draw/frame.html` with Edit calls: the next fold carries them everywhere.
6. **Finish the moment the last helper is back.** Start the save, `fold.js save "Three directions" "All three are up. Checking details" pictures`, then run `check.js` (section 5). Then `fold.js wait`: it prints how the save ended (run it again if it says still saving) and each layout fault measured on the saved page, which is a failure like the check's. Look at every picture (`<folder>/<slug>-1440.png` and `<slug>-390.png`, each the whole direction) in one message (section 5's look). Read the part files to fix in one message, then send the check's fixes and yours as Edit calls in one message: the writer folds them in. Then `fold.js stop "Three directions"`: it lets the last edits fold, stops the writer and saves (with nothing to fix, `stop` alone). Then reply, that version in your first line: no second look. Say nothing final while a helper draws, a save runs, or the check lists a failure you don't name. If the save's log shows an error, fix it and run that step again. If `wait` or `stop` says pushes were refused, tell the person in one line that the page isn't reaching their space. No local browser, Playwright, local server or build script.

**The save**, for the frame and the finish, never one per part: `fold.js save "<message>" "<status>"` saves a version in the background, pushes the newest page again and puts the status back. With `pictures` last, it also takes each whole direction at 1440 and 390 px wide, and the page measures itself for text squeezed into a thin column, words past an edge and words cut off.

**The helpers**, one per direction, all started in one message straight after the writer, each at `low` effort where your client lets you (Claude Code's `effort`):

1. **A few lines each, no brief yet:** "You draw Night Watch (`night-watch`): <its line and idea>. The facts: <every fact in the request>. Must hold in every direction, in the person's words: "<each requirement they stated>". The design shows each; the page never quotes one. Read sections 3 and 4 of `<this skill's folder>/SKILL.md` with your Read tool. Your first part is the direction's top as the product's user will see it (the product's name, a headline and one line, all written to that user, never about the design), with its styles inside that same part. Each part is one Write call to `<folder>/draw/night-watch/01.html`, `02.html` and on, and each change to a part one Edit call (never a heredoc or `sed`), its first line `<!-- status: Night Watch: <the part> -->`, every id starting `night-watch-`, at most 45 seconds of writing. One more part may go out before the brief if it needs no real label or row; a list, a table, a nav or anything named waits for it. Read the brief once, `node <this skill's folder>/assets/fold.js -C <folder> brief` (it waits for it), think the rest through once, and send it as parts in one message, no checks between them. Your last part is the script for Night Watch's own tabs, filters and buttons. Then run `node <this skill's folder>/assets/check.js -C <folder> night-watch` and fix what it lists, once, with Edit calls. Then stop: no other checks or rewrites. Never push, save or touch another direction's files, and run no other command. If a Write is refused, stop at once and say only: refused." Say in chat that the three are being drawn at once.
2. **While they draw, read (step 5) and write the brief:** what you read, and what each direction is for. Write it to `draw/BRIEF.md` with `ask: <the request word for word>` first, a line `fact: …` per fact, `not: …` for words no direction may show (the admin's own menu, when the person wants it separate), and `<!-- end brief -->` last.

## What good looks like

- **It is the thing, not a picture of it.** Every button, tab and link does something. A prototype can be tapped through on a phone.
- **The brand is exact.** The colours, fonts, logo and tone come from what the person gave you, not from your taste. When they gave nothing, the look is a deliberate choice you name in one line.
- **Directions really differ.** Three directions differ in layout, type and colour, not in shades of one idea.
- **Every fact survives.** Each name, price, time, item and claim in the request appears in the design, spelled as given.
- **It looks chosen, not generated.** Nothing a template would add by habit.

When readability and style pull apart, choose in this order: readable and accessible, easy to use, a clear hierarchy, then style, then decoration.

## Never

- Never use placeholder text ("Lorem ipsum", "Your headline here", "$XX") unless the person asked for a wireframe.
- Never add stock photos, hotlinked images, web fonts from a CDN, or scripts from another host. The space must work offline and on paper.
- Never invent brand values when the person gave some. Never swap their logo for a wordmark you drew.
- Never put `data-ss-id` on a button, link, input or label. It goes on the readable block around it.
- Never change what the person didn't ask to change during a revision. That covers words, order, spacing, other directions and the ids.
- Never fall back on the look that reads as machine-made, unless the brand or the person asks for it: a cream, beige or peach page by default; purple or blue-to-pink gradients, or a gradient on every surface; a stock UI sans (Inter, Roboto, Arial, plain `system-ui`) for headlines; rounded cards with a coloured left border; an icon beside every heading; emoji as icons; blobs, orbs and glows; people or scenes drawn in SVG.
- Never invent evidence: numbers, ratings, testimonials, customer logos, awards or press quotes the person didn't give. Leave that part out and say in your reply what would fill it.
- Never promise what Spacesheep can't do: dragging boxes on a canvas, PowerPoint or Google Slides export, Figma import, or saving a brand for them. Say what to do instead (references/after.md, "Limits").

## 1. Read the brief

The frame goes up from the request alone (step 2); the rest is read after it (step 5).

1. **The request, word for word.** List every fact it gives (names, prices, hours, items, screens, steps); each one must appear in the design. List every constraint too, such as "on a phone", "one A4 page", "clickable" or "three directions", and every requirement in the person's own words ("clearly separate from the standard organization view"): each direction keeps them all, whatever its idea.
2. **The brand.** Use the first of these that exists:
   1. A design system block in your instructions. It wins: its colours, fonts, corners and tone override the defaults.
   2. A brand sheet, logo or colours the person gave in this conversation, or already in the space's source. Read references/brand.md before using one.
   3. A space of theirs they point to ("like our homepage"), if you can read it.
   4. Nothing. Choose a look on purpose and say which and why in your reply. Set it from who it's for, on four dials: colour mood, type character, density and decoration. A plumber's page is plain, sturdy and quick to scan; a wine bar is dark, fine and spare; a kids' swim club is bright and rounded.
   If they said "our brand" and none of these exist, ask once which they mean, and build in a neutral look meanwhile.
3. **The space as it is now.** A redesign starts from the space's source, not the starter: it keeps every word, link, form and `data-ss-id` unless the person asked for new ones.
4. **The kind of design:** a one-pager or landing page, a clickable prototype, something for paper, a deck, or a set of components. Each has a part in section 4.

Ask at most one question, and only when a wrong guess would waste the whole build. Otherwise make the best guess, build it, and name the guess in your reply.

## 2. One design or three directions

- **Make three directions** when the person asks for options, directions, "a few", "some ideas" or "different looks". Make three as well when the look is the point and still open: a one-pager, landing page, poster or flyer in a new space, with no brand given and no style named. When they name a number, use it, from 2 to 5: more than 5 dilutes each one, so offer 5 and say why.
- **Make one design** when the brand and content are fixed and the person asked for one thing ("make a one-pager in our brand"), and for a prototype, a deck or a component sheet unless they ask for options.
- **All the directions sit in one space,** in one row on the canvas, with the pinned switcher: `assets/base.html` has both. Each direction is a `<section class="direction" data-ss-section data-ss-id="direction-<slug>" data-ss-thing="direction/<slug>">`. The `data-ss-thing` keeps comments on a direction while another shows. A link ending in `#direction-<slug>` opens that direction, and in a chat reply a button opens one with `{"emit": {"name": "show-direction", "data": {"id": "direction-<slug>"}}}`.
- **Name each direction by its idea** in 1 to 3 words ("Harbour Chart", "Night Watch", "Logbook"), never "Option A". Its line says what it is for ("Calm and plain, for owners who check once a month").
- **When the person picks one** ("the third, but bolder"), change only that direction, and make it the one the space opens on (`data-default`). Remove the others only when they say to ("go with it", "drop the others"), and record the pick under Decisions (section 6).

## 3. Build it so it works

- **The starter carries the frame.** `assets/base.html` has three metas: `ss-chat` puts chat beside the design (`content="open session"` when you are the person's own session, so their replies come back to you), `ss-workspace` adds Spacesheep's design bars (files, sizes, Tweaks), and `ss-canvas` lays the directions side by side with pan, zoom and Fit. Add no canvas, camera or controls of your own: Comment, Edit and versions are Spacesheep's.
- **Screens on the canvas.** Mark each screen `data-ss-frame="phone"`, `tablet`, `desktop` or a size such as `800x600`, with a `data-ss-label`, and place it with `data-ss-x` and `data-ss-y` if you need to. Every screen stays visible: never hide one.
- **Build from the kit, phone first.** The starter's parts finish their own alignment, wrapping and spacing at 390 and 1440 px: `.k-bar` (logo, nav, `.k-back`), `.k-hero` with `.k-actions`, `.k-cards` of `.k-card` (the last row always fills), `.k-table` (`data-label` on each cell, `.num` for numbers), `.k-stats` of `.k-stat`, `.k-chips` of `.k-chip`, `.k-btn` (`.line`, `.quiet`), `.k-search` (a label, and a placeholder of at most 20 characters), `.k-tabs`, `.k-filters` with a `.k-filters-toggle` button, `.k-steps` (`data-state="done"` or `"skipped"`, `aria-current="step"`) with `.k-steps-count`, `.k-empty` (the only "nothing here"), `.k-label` and `.k-meta`. Arrange them your direction's own way and restyle them freely, but never rebuild one, and add no shelf, scroller or width of your own. Tap targets are at least 44 px, body text at least 16 px.
- **One self-contained document.** Draw the logo as inline SVG (paste the SVG they gave you). Write icons as inline SVG from one family, coloured with `currentColor`, and only where they help someone find or tap something. Carry the design with type, colour, shape and the real content. Use system font stacks close to the brand font; add an `@font-face` with a data URI only when the person gave you the font file.
- **Tokens first.** Every brand value is a CSS variable named for its role. Colour comes in pairs, a surface and the text on it: `--brand-ground` and `--brand-ink`, `--brand-surface` and `--brand-on-surface`, `--brand-accent` and `--brand-on-accent`, with `--brand-muted` for quiet text; every pair reads at 4.5:1, and check.js measures them. Shape and rhythm: `--radius`, `--density`, `--rule`, `--shadow`, `--label-case`, `--label-track`, `--display-weight`, `--font-display`, `--font-body`. Each direction sets its own on its section, as the starter does, so its parts look like it and a change to one never touches the others.
- **Type that reads as designed.** Pair a display face with a different, quieter body face; use one family only for dense tools and data. Set every size on the starter's scale. Body text has a line height of 1.5 to 1.7 and lines of 45 to 75 characters (`max-width: 68ch`). The starter's three directions show display stacks with character.
- **One place for the eye.** Each screen has one thing seen first, then a second and a third level. Make the levels with size, weight, colour and space, not with boxes, borders and cards.
- **One accent, one bold move.** The accent shows at most twice on a screen: the main action and one highlight. Give the design one decisive move, such as a huge headline, one dark field or one striking number, and keep the rest quiet.
- **Real content only.** Use the person's words and facts, and name the product the design sits in on every direction (a page inside Spark says Spark). Where the request lacks something a real design needs, write plausible, specific wording and flag it in your reply ("I wrote the doors-open time as 6:30 pm: please check").
- **Everything clickable does something.** A link goes to a section, another screen or a real address. A button changes the state, opens what it names, or, in a mockup, shows a short line saying what it would do. Never leave a dead `href="#"`.
- **Commentable.** Every readable block has a unique, descriptive `data-ss-id` with its direction's prefix (`chart-hero`, `nightwatch-prices`). Every top-level section has `data-ss-section`. Ids stay stable from version to version.
- **Accessible.** Use real `<button>` and `<a>` elements, labels on inputs, visible focus styles, and `prefers-reduced-motion` to switch movement off.

## 4. Each kind of design

**One-pager or landing page.** One clear message at the top, the facts in the order a visitor needs them, and one main action, repeated at the end. Lead with the thing (the product, the menu, the timetable), not a slogan about it. Only one solid main button shows on a screen. Don't default to a hero, three feature cards, pricing and an FAQ: make one part something only this offer could have, such as its real price list as the hero.

**Clickable prototype.** Read references/prototypes.md first. Each screen is a section, and links and buttons move between screens inside the one space. State such as choices, limits and the selected item lives in a small inline script, so what the person taps works ("up to four passengers" refuses a fifth).

**Paper (a flyer, poster, menu or "one A4 page").** Nothing hidden behind motion or a click, no blurred shadows, fonts the server has. Add `@page { size: A4; margin: 12mm }` (or the size they name). Write no `@media print` rules: the platform adds them. Inside 12 mm margins an A4 sheet is about 700 × 1,030 px, and "one page" means it fits: shorten the copy or tighten the spacing, never text below 9 pt. Add `<button class="no-print" onclick="window.print()">Download PDF</button>`.

**Deck.** Follow the house presentation rules for slides. With directions, show a title slide and one content slide in each, then the full deck in the one they pick.

**Components or a style sheet.** Show each component in each of its states (default, hover or focus, disabled, error, empty), labelled, with the tokens table at the top.

**Motion.** CSS transitions and keyframes timed with `--ease` and `--dur`, only where they explain something: entrances, a state change, progress.

## 5. Checks, once it's visible

**The source checks are `check.js`'s:** the brief's facts and not-lines, six words quoted from the request or a direction's line, ids, links, handlers, scripts that parse, widths on a phone, placeholders, colours from the tokens, type size and page size. It prints each failure with its file, line and fix, or "all pass". Never write a check script of your own.

**The look is yours,** once per direction on its picture at the finish (order of work, step 6):

1. **Requirements.** It shows every requirement the person stated, without quoting one.
2. **Brand.** The fonts are the brand's or the stack you named, and the logo is theirs, unchanged. references/brand.md has the full check.
3. **Contrast.** Text passes AA: 4.5:1, or 3:1 at 24 px and larger, in hover, focus and selected states too. Change the background or border, never fade the text, and show a `:focus-visible` ring.
4. **Paper, when asked.** It fits the sheet, and nothing needed depends on motion or is hidden.
5. **Score.** From 1 to 5 on fit (made for this brief, or your usual default? Its idea shows in the layout, not only the colours: a stock card grid in new colours is a 2), hierarchy (one place for the eye?), finish (type, spacing and alignment exact?), specificity (could it belong to anyone else?) and restraint (one accent, one bold move, nothing from Never). Fix anything under 3. Then confirm in the picture: nothing cut off at an edge, no empty tile or band that looks like content, no card alone on a row.

## 6. Say what you made

Reply in at most five short lines:

- what you made and its saved version (one design, or three directions by name),
- the guesses you took (the brand source, any copy you wrote, anything you left out) and what is still rough,
- how to give feedback: tap a block and comment with @shepherd in it, or say it in this chat,
- the next step (pick a direction, approve it, or hand it to a developer).

**Keep a Decisions log on the space.** After the first revision or decision, add a folded section at the very end: `<details class="no-print" data-ss-id="decisions"><summary>Decisions</summary>…</details>`, one line per decision with the date and version ("11 Nov, v4: picked Night Watch; bolder type").

## 7. Revise from comments and chat

- **A request can come from the chat or from a comment that asks Shepherd** (it mentions @shepherd, or the person tapped Send to Shepherd). A comment is pinned to a block, and that block is the target: change only what it names.
- **Read the current source first** (`fold.js read`). The person may have changed words in Edit mode since your last version. Keep their edits.
- **Show it, then save it.** Push a status, make the smallest change on the block's `data-ss-id`, push the page (`fold.js push`), then save it (the save). Replace the whole document only for a redesign.
- **"Keep the layout" means nothing moves.** Change only token values, words or the one property named. A mood word ("calmer", "bolder") moves the matching tokens: hue and neutrals for colour, size and weight for type. Check contrast again.
- **Several asks:** make and push them one at a time, then save once.
- **Close the loop.** On a turn started from a comment, your reply is posted under it and you can't resolve it: say what changed in one line. On a chat turn, resolve each comment your change answered.
- **Every change is a version,** so history reads as a changelog. "Undo that" restores the earlier values in a new version.
- **Trying something without losing the current design:** add it as a new direction named for what changed ("Night Watch, lighter").

## 8. After the build

For client approval, a hand-off to a developer, saving a look as a brand, the tweaks panel, or anything Spacesheep can't do (PowerPoint, Figma, dragging boxes), read references/after.md first.

## Worked examples

**"Brand sheet and logo attached. We need a flyer for Harbour Lane Library's winter talks: a title, four talks with dates and speakers, the address and a book-a-seat button. People will read it on a phone, and we'll pin it up printed on one A4 page."**
One design, because the brand and content are fixed. Push the frame at once, then read the brand sheet (references/brand.md) and push the shared look: its tokens and the logo inline. Draw top down: the title block, the four talks with the date first, the address, the button. Add `@page { size: A4; margin: 12mm }` and the Download PDF button. Save it, look at its picture, and check: 4 talks, every colour a token, one A4 sheet. Reply: "Flyer in your brand. I wrote the title as 'Winter talks at Harbour Lane'. Comment on any block with @shepherd to change it."

**The comment "@shepherd just the date and the title, and make the dates our navy", pinned on the talks list.**
Edit only inside `talks`: cut each talk to its date and title, keeping every id, and set the dates to `var(--brand-ink)`. Check the contrast, push, save, and reply in one line with both changes.

**"We need a landing page for Tidewell, an app that tells small-boat owners when their mooring fees are due and lets them pay from a phone. It's £6 a month, and the first month is free. Give me three directions I can flick between."**
The frame is up within 90 seconds, its three directions named in chat. Helpers draw the three at once, each top first and with every fact (due-date reminders, paying from a phone, £6 a month, first month free). Then one save with the three pictures, one look at each, one round of fixes.
Then "The third one, but bolder. Don't touch the words." Change only the type and colour tokens on the third direction's section, check its contrast, make it the default, and add a line to Decisions.

## Files

- assets/base.html: the starter page, with the metas, the switcher, the kit's parts (section 3), token pairs and three empty directions. `fold.js start` copies it when the space holds no design.
- assets/fold.js: every step that talks to the space, each listed in its header. assets/check.js: the source checks, read-only.
- references/directions.md: making directions differ and naming them. Read it at order of work, step 2.
- references/brand.md: reading a brand sheet into tokens, the brand check, and the design system note format. Read it at order of work, step 5, when a brand is given.
- references/prototypes.md: screens, navigation and state in one space. Read it before drawing a prototype.
- references/after.md: approval, hand-off, saving a brand, the tweaks panel and the limits. Read it when one comes up.
- references/handoff.md: the "For developers" section. Read it before a hand-off.
- references/coverage.md: background for whoever maintains this skill, not needed for a turn.
- assets/switcher.html: the switcher on its own, with three demo directions.
- assets/tweaks.html: the optional tweaks panel (references/after.md says when).
