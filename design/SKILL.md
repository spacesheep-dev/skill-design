---
name: design
description: Use when someone asks for a design to look at or click through, such as a mockup, landing page, one-pager, poster, flyer, clickable prototype, redesign, or "a few directions" to pick from, in their brand or a fresh look. It builds the design as a space they can open on a phone, comment on, approve and hand to a developer.
---

# Design

You make designs as spaces: one self-contained HTML document that the person opens on a phone, comments on block by block, approves, and hands to a developer. Spacesheep's own rules for a space still hold (Design Standards, mobile first, `data-ss-id` anchors, forms, slides and paper). This skill adds how a good designer works, and in what order.

**The person watches the page fill in as you build it. Nothing waits for a check before its first push, and no 45 seconds pass with nothing new on the page or in its status line.**

**Getting this skill:** as a folder, everything is here. Otherwise, `npx -y spacesheep@latest skills get @spacesheep/design --view full` gives these words and the file list, and step 1 fetches the starter page. Read a reference only at the step that names it.

## Order of work

`<space>` below is the space's id, from step 1 on (saves by its link are refused from the second one on). Write it in full in every shell call, since each call starts fresh. A push draws the page in every open tab in about 2 seconds. A save takes 15 seconds or more, so saves run in the background (the save line, below) and never hold up the next push. Without a shell (a Shepherd turn), take the same steps with your own tools.

1. **Start at once.** With the link the person gave: `npx -y spacesheep@latest live push --space <link> --status "Reading your brief" && npx -y spacesheep@latest spaces get <link> | head -2 && npx -y spacesheep@latest read <link> -o work`. Its `id:` line is `<space>`. If `work/index.html` isn't a design yet, copy the starter over it: `cp assets/base.html work/index.html` from this skill's folder, or fetched: `npx -y spacesheep@latest skills get @spacesheep/design --path assets/base.html --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).file.text))' > work/index.html`. With no space yet, put the starter in `work`: `npx -y spacesheep@latest deploy work --title "<working title>" --json` makes one, and its `space.id` is `<space>`.
2. **Push the frame within 90 seconds, before you read anything else.** From the brief alone, set the title and each direction's slug, name, line and tokens in `work/index.html` (section 2 says how many). Push it, save it, and say in chat: "Three directions on the way: Harbour Chart, Night Watch, Logbook. Say if one is wrong."
3. **Read what the brief points at,** with a status for each thing ("Reading Spark's Orbit pages"). The moment the shared look is set (the brand's tokens, logo and fonts), push it, so the frame changes colour and type before any section is written. If the reading changes a direction, rename it and push. Names and slugs may change until a direction's first part is drawn.
4. **Draw breadth first, in parts of at most 45 seconds of writing.** After each part, push the page and the next part's status in one shell call: `npx -y spacesheep@latest live push --space <space> --html "$(cat work/index.html)" && npx -y spacesheep@latest live push --space <space> --status "Drawing Night Watch: prices"`.
   1. **The top of every direction first** (of one design, its top). Replace each direction's `.drawing` block with its hero, pushing after each one. The person sees all three ideas within about 3 minutes and can redirect before most of the work is spent. Save once all three tops are in, and say so in chat.
   2. **Then fill in each direction, top down,** one part at a time: the hero's detail, then the list, then the rest. A part that would take longer than 45 seconds to write is two parts. When a direction is complete, save it with its picture and say one line in chat.
5. **Nothing waits for a look.** A finished direction's save leaves a picture of it, `<slug>.png`, about 30 seconds later. When it's there, look at it and run the checks in section 5 on your source while you go on drawing. Their fixes go into a later push. If `save.log` shows an error, fix it and save again. No local browser, Playwright, local server or build script.
6. **Finish.** Run the last save in the foreground, `npx -y spacesheep@latest deploy work --space <space> -m "Three directions"`, so your reply names a saved version (section 6).

**The save line**, for the frame, the three tops and each finished direction, never one per part. It saves, pushes the newest page again (a save lands seconds behind your newest push), puts the status back (a save takes it down), and takes the picture:

```sh
(npx -y spacesheep@latest deploy work --space <space> -m "Night Watch" && npx -y spacesheep@latest live push --space <space> --html "$(cat work/index.html)" && npx -y spacesheep@latest live push --space <space> --status "Drawing Logbook" && npx -y spacesheep@latest spaces screenshot <space> --width 1920 --height 1080 --section direction-night-watch -o night-watch.png) > save.log 2>&1 &
```

The frame's and the tops' saves take no picture: end their line after the status. Keep the page under 100 KB, so a push fits in one shell argument.

## What good looks like

- **It is the thing, not a picture of it.** Every button, tab and link does something. A prototype can be tapped through on a phone.
- **The brand is exact.** The colours, fonts, logo and tone come from what the person gave you, not from your taste. When they gave nothing, the look is a deliberate choice you name in one line.
- **Directions really differ.** Three directions differ in layout, type and colour, not in shades of one idea.
- **Every fact survives.** Each name, price, time, item and claim in the request appears in the design, spelled as given.
- **It is easy to change.** Stable `data-ss-id`s mean comments stay pinned across versions. Colours and spacing live in CSS variables, so a change is one edit.
- **It keeps its history.** Each change is its own version with a one-line reason, and decisions are written down on the space.
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

The frame goes up from the request alone (order of work, step 2). Everything else here is read after it, with a status line saying what.

1. **The request, word for word.** List every fact it gives (names, prices, hours, items, screens, steps); each one must appear in the design. List every constraint too, such as "on a phone", "one A4 page", "clickable" or "three directions".
2. **The brand.** Use the first of these that exists:
   1. A design system block in your instructions. It wins: its colours, fonts, corners and tone override the defaults.
   2. A brand sheet, logo or colours the person gave in this conversation, or already in the space's source. Read references/brand.md before using one.
   3. A space of theirs they point to ("like our homepage"), if you can read it.
   4. Nothing. Choose a look on purpose and say which and why in your reply. Set it from who it's for, on four dials: colour mood, type character, density and decoration. A plumber's page is plain, sturdy and quick to scan; a wine bar is dark, fine and spare; a kids' swim club is bright and rounded; a clearance sale is loud and dense.
   If they said "our brand" and none of these exist, ask once which they mean, and build in a neutral look meanwhile.
3. **The space as it is now.** A redesign starts from the space's source, not the starter: it keeps every word, link, form and `data-ss-id` unless the person asked for new ones.
4. **The kind of design:** a one-pager or landing page, a clickable prototype, something for paper, a deck, or a set of components. Each has a part in section 4.

Ask at most one question, and only when a wrong guess would waste the whole build. Otherwise make the best guess, build it, and name the guess in your reply.

## 2. One design or three directions

- **Make three directions** when the person asks for options, directions, "a few", "some ideas" or "different looks". Make three as well when the look is the point and still open: a one-pager, landing page, poster or flyer in a new space, with no brand given and no style named. When they name a number, use it, from 2 to 5: more than 5 dilutes each one, so offer 5 and say why.
- **Make one design** when the brand and content are fixed and the person asked for one thing ("make a one-pager in our brand"), and for a prototype, a deck or a component sheet unless they ask for options.
- Read references/directions.md while the frame is up (order of work, step 3), and rename the directions if it changes them. It covers how to make them differ, how to name them and the mistakes to avoid.
- **All the directions sit in one space,** in one row on the canvas, with the pinned switcher: `assets/base.html` has both. Each direction is a `<section class="direction" data-ss-section data-ss-id="direction-<slug>" data-ss-thing="direction/<slug>">`. The `data-ss-thing` keeps comments on a direction while another shows. A link ending in `#direction-<slug>` opens that direction, and in a chat reply a button opens one with `{"emit": {"name": "show-direction", "data": {"id": "direction-<slug>"}}}`.
- **Name each direction by its idea** in 1 to 3 words ("Harbour Chart", "Night Watch", "Logbook"), never "Option A". Its line says what it is for ("Calm and plain, for owners who check once a month").
- **When the person picks one** ("the third, but bolder"), change only that direction, and make it the one the space opens on (`data-default`). Remove the others only when they say to ("go with it", "drop the others"), and record the pick under Decisions (section 6).

## 3. Build it so it works

- **The starter carries the frame.** `assets/base.html` has three metas: `ss-chat` puts chat beside the design (`content="open session"` when you are the person's own session, so their replies come back to you), `ss-workspace` adds Spacesheep's design bars (files, sizes, Tweaks), and `ss-canvas` lays the directions side by side with pan, zoom and Fit. Add no canvas, camera or controls of your own: Comment, Edit and versions are Spacesheep's.
- **Screens on the canvas.** Mark each screen `data-ss-frame="phone"`, `tablet`, `desktop` or a size such as `800x600`, with a `data-ss-label`, and place it with `data-ss-x` and `data-ss-y` if you need to. Every screen stays visible: never hide one.
- **Phone first.** Design at 390 px wide, then let it grow to 1440 px. Nothing scrolls sideways at 390 px. Tap targets are at least 44 px. Body text is at least 16 px.
- **One self-contained document.** Draw the logo as inline SVG (paste the SVG they gave you). Write icons as inline SVG from one family, coloured with `currentColor`, and only where they help someone find or tap something. Carry the design with type, colour, shape and the real content. Use system font stacks close to the brand font; add an `@font-face` with a data URI only when the person gave you the font file.
- **Tokens first.** Every brand value is a CSS variable named for its role (`--brand-ink`, `--brand-accent`, `--brand-ground`, `--font-display`, `--font-body`, `--radius`, `--space`). Each direction sets its own on its section, as the starter does, so a change to one never touches the others. Write the rest of the CSS with the variables.
- **Type that reads as designed.** Pair a display face with a different, quieter body face; use one family only for dense tools and data. Set every size on the starter's scale. Body text has a line height of 1.5 to 1.7 and lines of 45 to 75 characters (`max-width: 68ch`). Without a font file a display stack can still have character: `"Iowan Old Style", Palatino, Georgia, serif`, `"Avenir Next", Futura, "Gill Sans", sans-serif` or `ui-monospace, Menlo, monospace`.
- **One place for the eye.** Each screen has one thing seen first, then a second and a third level. Make the levels with size, weight, colour and space, not with boxes, borders and cards.
- **One accent, one bold move.** The accent shows at most twice on a screen: the main action and one highlight. Give the design one decisive move, such as a huge headline, one dark field or one striking number, and keep the rest quiet.
- **Real content only.** Use the person's words and facts. Where the request lacks something a real design needs, write plausible, specific wording and flag it in your reply ("I wrote the doors-open time as 6:30 pm: please check").
- **Everything clickable does something.** A link goes to a section, another screen or a real address. A button changes the state, opens what it names, or, in a mockup, shows a short line saying what it would do. Never leave a dead `href="#"`.
- **Commentable.** Every readable block has a unique, descriptive `data-ss-id` with its direction's prefix (`chart-hero`, `nightwatch-prices`). Every top-level section has `data-ss-section`. Ids stay stable from version to version.
- **Accessible.** Text passes WCAG AA contrast against its own background. Use real `<button>` and `<a>` elements, labels on inputs, visible focus styles, and `prefers-reduced-motion` to switch movement off.

## 4. Each kind of design

**One-pager or landing page.** One clear message at the top, the facts in the order a visitor needs them, and one main action, repeated at the end. Lead with the thing (the product, the menu, the timetable), not a slogan about it. Only one solid main button shows on a screen. Don't default to a hero, three feature cards, pricing and an FAQ: make one part something only this offer could have, such as its real price list as the hero.

**Clickable prototype.** Read references/prototypes.md first. Each screen is a section, and links and buttons move between screens inside the one space. State such as choices, limits and the selected item lives in a small inline script, so what the person taps works ("up to four passengers" refuses a fifth).

**Paper (a flyer, poster, menu or "one A4 page").** Nothing hidden behind motion or a click, no blurred shadows, fonts the server has. Add `@page { size: A4; margin: 12mm }` (or the size they name). Write no `@media print` rules: the platform adds them. Inside 12 mm margins an A4 sheet is about 700 × 1,030 px, and "one page" means it fits: shorten the copy or tighten the spacing, never text below 9 pt. Add `<button class="no-print" onclick="window.print()">Download PDF</button>`.

**Deck.** Follow the house presentation rules for slides. With directions, show a title slide and one content slide in each, then the full deck in the one they pick.

**Components or a style sheet.** Show each component in each of its states (default, hover or focus, disabled, error, empty), labelled, with the tokens table at the top.

**Motion.** CSS transitions and keyframes timed with `--ease` and `--dur`, only where they explain something: entrances, a state change, progress. A space for paper has none.

## 5. Checks, once it's visible

Run these after each direction is on the page (order of work, step 5), on your source and the one picture, and fix what they find in the next push. Do at most two rounds per direction, then move on and say in your reply what is still rough.

1. **Facts.** Every fact from the request is in the design, spelled as given. Count the items: "six items" means six.
2. **Brand.** Every colour is one of the brand's tokens or a neutral made from the ink. The fonts are the brand's or the stack you named. The logo is theirs, unchanged. references/brand.md has the full check.
3. **Phone.** Nothing is wider than 390 px: no fixed widths, no long unbroken strings, images with `max-width: 100%`. Tap targets are 44 px or more. Display type is sized with `clamp()` and fits its column, never forced with `white-space: nowrap`. Nothing overlaps by accident.
4. **Clicks.** Every link and button has a target or a state change. A prototype can be walked from its first screen to its last.
5. **Contrast.** Text passes AA: 4.5:1, or 3:1 at 24 px and larger, in hover, focus and selected states too. Change the background or border, never fade the text, and show a `:focus-visible` ring.
6. **Paper, when asked.** It fits the sheet, and nothing needed depends on motion or is hidden.
7. **Anchors.** Every readable block has a unique `data-ss-id`, and no control has one.
8. **Look.** Score the picture from 1 to 5 on fit (made for this brief, or your usual default?), hierarchy (one place for the eye?), finish (type, spacing and alignment exact?), specificity (could it belong to anyone else?) and restraint (one accent, one bold move, nothing from Never). Fix anything under 3.

## 6. Say what you made

Reply in at most five short lines:

- what you made (one design, or three directions by name),
- the guesses you took (the brand source, any copy you wrote, anything you left out),
- how to give feedback: tap a block and comment with @shepherd in it, or say it in this chat,
- the next step (pick a direction, approve it, or hand it to a developer).

**Keep a Decisions log on the space.** After the first revision or decision, add a folded section at the very end: `<details class="no-print" data-ss-id="decisions"><summary>Decisions</summary>…</details>`, one line per decision with the date and version ("11 Nov, v4: picked Night Watch; bolder type").

## 7. Revise from comments and chat

- **A request can come from the chat or from a comment that asks Shepherd** (it mentions @shepherd, or the person tapped Send to Shepherd). A comment is pinned to a block, and that block is the target: change only what it names.
- **Read the current source first** (`npx -y spacesheep@latest read <space> -o work`). The person may have changed words in Edit mode since your last version. Keep their edits.
- **Show it, then save it.** Push a status, make the smallest change on the block's `data-ss-id`, push the page, then save it with the save line. Replace the whole document only for a redesign.
- **"Keep the layout" means nothing moves.** Change only token values, words or the one property named. A mood word ("calmer", "bolder") moves the matching tokens: hue and neutrals for colour, size and weight for type. Check contrast again.
- **Several asks:** make and push them one at a time, then save once.
- **Close the loop.** On a turn started from a comment, your reply is posted under it and you can't resolve it: say what changed in one line. On a chat turn, resolve each comment your change answered.
- **Every change is a version,** so history reads as a changelog. "Undo that" restores the earlier values in a new version; any version can also be restored from the space's history.
- **Trying something without losing the current design:** add it as a new direction named for what changed ("Night Watch, lighter").

## 8. After the build

For client approval, a hand-off to a developer, saving a look as a brand, the tweaks panel, or anything Spacesheep can't do (PowerPoint, Figma, dragging boxes), read references/after.md first.

## Worked examples

**"Brand sheet and logo attached. We need a flyer for Harbour Lane Library's winter talks: a title, four talks with dates and speakers, the address and a book-a-seat button. People will read it on a phone, and we'll pin it up printed on one A4 page."**
One design, because the brand and content are fixed. Push the frame at once, then read the brand sheet (references/brand.md) and push the shared look: its tokens and the logo inline. Draw top down: the title block, the four talks with the date first, the address, the button. Add `@page { size: A4; margin: 12mm }` and the Download PDF button. Save it, look at its picture, and check: 4 talks, every colour a token, one A4 sheet. Reply: "Flyer in your brand. I wrote the title as 'Winter talks at Harbour Lane'. Comment on any block with @shepherd to change it."

**The comment "@shepherd just the date and the title, and make the dates our navy", pinned on the talks list.**
Edit only inside `talks`: cut each talk to its date and title, keeping every id, and set the dates to `var(--brand-ink)`. Check the contrast, push, save, and reply in one line with both changes.

**"We need a landing page for Tidewell, an app that tells small-boat owners when their mooring fees are due and lets them pay from a phone. It's £6 a month, and the first month is free. Give me three directions I can flick between."**
Within 90 seconds the frame is up with three named, empty directions and a chat line naming them. Then the three heroes, pushed one by one, then each direction filled in part by part, each with every fact (due-date reminders, paying from a phone, £6 a month, first month free). After each one's save, its picture and the checks.
Then "The third one, but bolder. Don't touch the words." Change only the type and colour tokens on the third direction's section, check its contrast, make it the default, and add a line to Decisions.

## Files

- assets/base.html: the starter page, with the metas, the switcher, tokens and three empty directions. Copy it at step 1.
- references/directions.md: making directions differ and naming them. Read it at order of work, step 3.
- references/brand.md: reading a brand sheet into tokens, the brand check, and the design system note format. Read it at order of work, step 3, when a brand is given.
- references/prototypes.md: screens, navigation and state in one space. Read it before drawing a prototype.
- references/after.md: approval, hand-off, saving a brand, the tweaks panel and the limits. Read it when one comes up.
- references/handoff.md: the "For developers" section. Read it before a hand-off.
- references/coverage.md: background for whoever maintains this skill, not needed for a turn.
- assets/switcher.html: the switcher on its own, with three demo directions.
- assets/tweaks.html: the optional tweaks panel (references/after.md says when).
