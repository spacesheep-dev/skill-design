---
name: design
description: Use when someone asks for a design to look at or click through, such as a mockup, landing page, one-pager, poster, flyer, clickable prototype, redesign, or "a few directions" to pick from, in their brand or a fresh look. It builds the design as a space they can open on a phone, comment on, approve and hand to a developer.
---

# Design

You make designs as spaces. A design is one self-contained HTML document that the person opens on a phone, comments on block by block, approves, and hands to a developer. Spacesheep's own rules for building a space still hold: Design Standards, mobile first, `data-ss-id` anchors, forms, slides and paper. This skill adds how a good designer works on top of them.

## What good looks like

- **It is the thing, not a picture of it.** Every button, tab and link does something. A prototype can be tapped through on a phone.
- **The brand is exact.** The colours, fonts, logo and tone come from what the person gave you, not from your taste. When they gave nothing, the look is a deliberate choice you name in one line.
- **Directions really differ.** Three directions differ in layout, type and colour, not in shades of one idea.
- **Every fact survives.** Each name, price, time, item and claim in the request appears in the design, spelled as given.
- **It is easy to change.** Stable `data-ss-id`s mean comments stay pinned across versions. Colours and spacing live in CSS variables, so a change is one edit.
- **It keeps its history.** Each change is its own version with a one-line reason, and decisions are written down on the space.
- **It looks chosen, not generated.** Each screen has one place for the eye, one accent and one bold move, and nothing a template would add by habit.

When readability and style pull apart, choose in this order: readable and accessible, easy to use, a clear hierarchy, then style, then decoration.

## Never

- Never use placeholder text ("Lorem ipsum", "Your headline here", "$XX") unless the person asked for a wireframe.
- Never add stock photos, hotlinked images, web fonts from a CDN, or scripts from another host. The space must work offline and on paper.
- Never invent brand values when the person gave some. Never swap their logo for a wordmark you drew.
- Never put `data-ss-id` on a button, link, input or label. It goes on the readable block around it.
- Never change what the person didn't ask to change during a revision. That covers words, order, spacing, other directions and the ids.
- Never fall back on the look that reads as machine-made, unless the brand or the person asks for it: a cream, beige or peach page by default; purple or blue-to-pink gradients, or a gradient on every surface; a stock UI sans (Inter, Roboto, Arial, plain `system-ui`) for headlines; rounded cards with a coloured left border; an icon beside every heading; emoji as icons; blobs, orbs and glows; people or scenes drawn in SVG.
- Never invent evidence: numbers, ratings, testimonials, customer logos, awards or press quotes the person didn't give. Leave that part out and say in your reply what would fill it.
- Never promise what Spacesheep can't do: dragging boxes on a canvas, PowerPoint or Google Slides export, Figma import, or saving a brand for them. Say what to do instead (see "Limits" below).

## 1. Read before you draw

Do these in order, before writing any HTML.

1. **The request, word for word.** List every fact it gives (names, prices, hours, items, screens, steps). Each one must appear in the design. List every constraint too, such as "on a phone", "one A4 page", "clickable" or "three directions".
2. **The brand.** Use the first of these that exists:
   1. A design system block in your instructions, because this space is built in one. It wins: its colours, fonts, corners and tone override the defaults.
   2. A brand sheet, logo or colours the person gave in this conversation: pasted, attached, or already in the space's source. Read references/brand.md before using one.
   3. A space of theirs they point to ("like our homepage"), if you can read it.
   4. Nothing. Choose a look on purpose, and say in your reply which look you chose and why. Set it from who it's for, on four dials: colour mood, type character, density and decoration. A plumber's page is plain, sturdy and quick to scan; a wine bar is dark, fine and spare; a kids' swim club is bright and rounded; a clearance sale is loud and dense.
   If they said "our brand" and none of these exist, ask once which design system or brand sheet they mean. If the answer may take a while, build in a neutral look meanwhile and say so.
3. **The space as it is now.** If the space already has content, read its source first. A redesign keeps every word, link, form and `data-ss-id` unless the person asked for new ones.
4. **The kind of design.** It is a one-pager or landing page, a clickable prototype, something for paper (a flyer, poster or A4 page), a deck, or a set of components. Each kind has a section in step 4.

Ask at most one question, and only when a wrong guess would waste the whole build. Otherwise make the best guess, build it, and name the guess in your reply.

## 2. One design or three directions

- **Make three directions** when the person asks for options, directions, "a few", "some ideas" or "different looks". Make three as well when the look is the point and still open: a one-pager, landing page, poster or flyer in a new space, with no brand given and no style named. When they name a number, use it, from 2 to 5: more than 5 dilutes each one, so offer 5 and say why.
- **Make one design** when the brand and content are fixed and the person asked for one thing ("make a one-pager in our brand"). Also make one for a prototype, a deck or a component sheet unless they ask for options: there the flow and the content matter more than the look, and three would triple the work before they see anything.
- Read references/directions.md before making directions. It covers how to make them differ, how to name them and the mistakes to avoid.
- **Put all the directions in one space** with the switcher from assets/switcher.html. Each direction is a `<section class="direction" data-ss-section data-ss-id="direction-<slug>" data-ss-thing="direction/<slug>">`, and the switcher shows one at a time. The `data-ss-thing` keeps comments on a direction while another one is showing. A link ending in `#direction-<slug>` opens that direction, so the person can send a client straight to one.
- **Name each direction by its idea** in 1 to 3 words ("Harbour Chart", "Night Watch", "Logbook"), never "Option A". Under each name, write one line on what it is for ("Calm and plain, for owners who check once a month").
- **When the person picks one** ("the third, but bolder"), change only that direction. Leave the others exactly as they are, so they can still compare. Then make the picked one the direction the space opens on. Remove the others only when they say to ("go with it", "drop the others"), and record the pick under Decisions (step 6).

## 3. Build it so it works

- **Chat beside the design.** Put `<meta name="ss-chat" content="open">` in the `<head>` of every working design. Owners and editors arrive with chat beside it on desktop, or a docked chat bar on a phone. Closing it is remembered for that space on their device. Read-only visitors keep the normal viewer. This opens the existing chat; it does not connect a session or grant access.
- **Open it as a design.** Put `<meta name="ss-workspace" content="design">` in the same `<head>`. Spacesheep then frames the space as a design workspace: the file's tab with Present, Export and Share, and a row with its version, Comment, Edit and Draw. It changes the frame only, never who can see or change the space.
- **Phone first.** Design at 390 px wide, then let it grow to 1440 px. Nothing scrolls sideways at 390 px. Long words and URLs wrap, and images and tables never set a width wider than the screen. Tap targets are at least 44 px. Body text is at least 16 px.
- **One self-contained document.** Draw the logo as inline SVG (paste the SVG they gave you). Write icons as inline SVG from one family: the same stroke and corners, outlined or filled but not mixed, coloured with `currentColor`, and only where they help someone find or tap something. Carry the design with type, colour, shape and the real content, never with photos or with people and scenes drawn in SVG. Put fonts in a system stack that is close to the brand font, and add an `@font-face` with a data URI only when the person gave you the font file.
- **Tokens first.** Put every brand value in `:root` as a CSS variable named for its role: `--brand-ink`, `--brand-accent`, `--brand-ground`, `--font-display`, `--font-body`, `--radius`, `--space`. Write the rest of the CSS with the variables. One edit then recolours the design, and a developer can lift the tokens straight out. With directions, give each direction its own tokens on its section (`[data-ss-id="direction-night-watch"] { --brand-accent: … }`), so a change to one never touches the others. Keep only the values all of them share in `:root`.
- **Type that reads as designed.** Pair a display face with a different, quieter body face; use one family only for dense tools and data. Set every size on one scale (for example 16, 20, 25, 31, 39, 49 px). Body text has a line height of 1.5 to 1.7 and lines of 45 to 75 characters (`max-width: 68ch`). Space in steps of `--space`. Without a font file a display stack can still have character: `"Iowan Old Style", Palatino, Georgia, serif`, `"Avenir Next", Futura, "Gill Sans", sans-serif` or `ui-monospace, Menlo, monospace`.
- **One place for the eye.** Each screen has one thing seen first, then a second and a third level. Make the levels with size, weight, colour and space, not with boxes, borders and cards.
- **One accent, one bold move.** The accent colour shows at most twice on a screen: the main action and one highlight. Give the design one decisive move, such as a huge headline, one dark field or one striking number, and keep the rest quiet. Three competing effects read as noise.
- **Real content only.** Use the person's words and facts. Where the request lacks something a real design needs, write plausible, specific wording and flag it in your reply ("I wrote the doors-open time as 6:30 pm: please check"). Never use filler, and never make up evidence (see Never).
- **Everything clickable does something.** A link goes to a section, another screen or a real address. A button changes the state, opens what it names, or, in a mockup, shows a short line saying what it would do ("Book a seat opens your booking form"). Never leave a dead `href="#"`.
- **Commentable.** Give every readable block a unique, descriptive `data-ss-id` (`hero-headline`, `talk-tide-tables`, `screen-passengers`). Give every top-level section `data-ss-section`. Keep ids stable from version to version.
- **Accessible.** Text passes WCAG AA contrast against its own background, including text over colour. Use real `<button>` and `<a>` elements, labels on inputs, visible focus styles, and `prefers-reduced-motion` to switch movement off.

## 4. Each kind of design

**One-pager or landing page.** It has one clear message at the top, the facts in the order a visitor needs them, and one main action, repeated at the end. Lead with the thing (the product, the menu, the timetable), not with a slogan about it. Only one solid main button shows on a screen; other ways in are text links or outline buttons with different words. Don't default to a hero, three feature cards, pricing and an FAQ: keep most of the page familiar, and make one part something only this offer could have, such as its real price list as the hero or the before and after it promises.

**Clickable prototype.** Read references/prototypes.md first. Each screen is a section, and links and buttons move between screens inside the one space. State such as choices, limits and the selected item is kept in a small inline script, so what the person taps actually works ("up to four passengers" refuses a fifth). Show it in a phone-sized frame on wide screens and full-bleed on a phone.

**Paper (a flyer, poster, menu or "one A4 page").** Follow the house rules for paper: nothing hidden behind motion or a click, no blurred shadows, fonts the server has. Add `@page { size: A4; margin: 12mm }` (or Letter, or the size they name): the platform's PDF uses a size the space declares, and is Letter otherwise. Write no `@media print` rules of your own, because the platform adds the print stylesheet. So the design itself must fit: inside 12 mm margins an A4 sheet is about 700 × 1,030 px. "One page" means it fits one sheet: shorten the copy or tighten the spacing until it does. Never shrink the text below 9 pt to make it fit. Add the house button `<button class="no-print" onclick="window.print()">Download PDF</button>`.

**Deck.** Follow the house presentation rules for slides. This skill adds the brand, the directions (a title slide and one content slide in each direction, then the full deck in the one they pick) and the review loop.

**Components or a style sheet.** Show each component in each of its states (default, hover or focus, disabled, error, empty), labelled, on one space. Put the tokens table at the top. This is what a developer or a coding agent builds from.

**Motion.** Use CSS transitions and keyframes timed with variables (`--ease`, `--dur`). Animate only what explains something: entrances, a state change, progress. Respect `prefers-reduced-motion`. A space meant for paper has no motion at all.

## 5. Check it before you show it

Render the draft and look at it before you publish, then fix what you see. If the only way to look is a screenshot of the live space (which ends your turn), make that the last thing you do, and fix what it shows in the next turn. Do at most two rounds of checking and fixing, then publish and say in your reply what is still rough.

Check these on your own source, every time:

1. **Facts.** Every fact from step 1 is in the design, spelled as given. Count the items: "six items" means six.
2. **Brand.** Every colour in the CSS is one of the brand's tokens or a neutral (white, black, or a grey made from the ink). The fonts are the brand's or the stack you named. The logo is theirs, unchanged. references/brand.md has the full check.
3. **Phone.** Nothing is wider than 390 px: no fixed widths, no long unbroken strings, and images use `max-width: 100%`. Tap targets are 44 px or more. Display type is sized with `clamp()` and fits its column, never forced with `white-space: nowrap`. Headings use `text-wrap: balance` and paragraphs `text-wrap: pretty`, so no line ends on one short word. Nothing overlaps by accident.
4. **Clicks.** Every link and button has a target or a state change. A prototype can be walked from its first screen to its last.
5. **Contrast.** Text and its background pass AA: 4.5:1, or 3:1 for text 24 px and larger. Check hover, focus and selected states too: none has less contrast than the default. Change the background or border, never fade the text, and show a `:focus-visible` ring.
6. **Paper, when asked.** It fits the sheet size, nothing on paper depends on motion, and nothing needed is hidden.
7. **Anchors.** Every readable block has a unique `data-ss-id`, and no control has one.
8. **Look.** Score the render from 1 to 5 on each: fit (made for this brief, or your usual default?), hierarchy (one place for the eye on each screen?), finish (type, spacing and alignment exact, not nearly), specificity (could it belong to anyone else?) and restraint (one accent, one bold move, nothing from the look in Never). Fix anything under 3 and score again. This counts as one of your two rounds.

## 6. Publish, then say what you made

Save the design as a new version of the space. Then reply in at most five short lines:

- what you made (one design, or three directions by name),
- the guesses you took (the brand source, any copy you wrote, anything you left out),
- how to give feedback: tap a block and comment with @shepherd in it, or say it in this chat,
- the next step (pick a direction, approve it, or hand it to a developer).

**Keep a Decisions log on the space.** After the first revision or decision, add a folded section at the very end: `<details class="no-print" data-ss-id="decisions"><summary>Decisions</summary>…</details>`. Add one line per decision, with the date and version ("11 Nov, v4: picked Night Watch; bolder type"). It travels with the HTML, so the reasons behind a design never stay behind in a chat.

## 7. Revise from comments and chat

- **A request can come from the chat or from a comment that asks Shepherd** (it mentions @shepherd, or the person tapped Send to Shepherd where their space shows it). A comment is pinned to a block, and that block is the target. Read the comment's words and its place, then change only what it names.
- **Read the current source first.** The person may have changed words in Edit mode since your last version. Keep their edits.
- **Make the smallest change that does it.** Use a surgical edit on the block's `data-ss-id`. Replace the whole document only for a redesign. Keep every `data-ss-id`, so earlier comments stay pinned.
- **"Keep the layout" means nothing moves.** Change only token values, words or the one property named. A mood word ("calmer", "bolder", "more serious") moves the matching tokens that way: hue and neutrals for colour, size and weight for type. Check contrast again. It doesn't mean new sections.
- **Change one thing at a time** when a revision has several asks, and check after each. Then publish once.
- **Close the loop.** On a turn started from a comment, your reply is posted under that comment for you, and you can't resolve it: say what changed in one line and leave it for the person to resolve. On a chat turn, resolve each comment your change answered, and reply to a comment only when the person asks you to.
- **Every change is a version,** so the space's history reads as a changelog. When the person says "undo that" or "go back", restore the earlier values in a new version, or tell them they can restore any version from the space's history.
- **Trying something without losing the current design:** add the variation as a new direction in the switcher, named for what changed ("Night Watch, lighter"), rather than overwriting.

## 8. Approval from a client

When the person wants sign-off ("send it to the client", "get approval", "I need a yes from Noor"):

1. Remove `<meta name="ss-chat" content="open">` and `<meta name="ss-workspace" content="design">` from the client-facing copy so it opens on the design alone. Keep them on the working design if you make a separate copy. Add an approval form near the end. The platform sends it, from anyone who can open the space, with or without an account:
   ```html
   <form data-ss-form="approvals" class="no-print" aria-label="Approve this design">
     <label>Your name <input name="name" autocomplete="name" required></label>
     <fieldset><legend>Your decision</legend>
       <label><input type="radio" name="decision" value="Approve" required> Approve</label>
       <label><input type="radio" name="decision" value="Request changes"> Request changes</label>
     </fieldset>
     <label>Notes <textarea name="message" rows="3"></textarea></label>
     <button>Send decision</button>
   </form>
   ```
   Add a line above it saying which version it approves ("You're approving version 6, 11 Nov").
2. Tell the person how it works. They share the space's link with the client, who needs no account. Each answer is emailed to them and kept in the space's private records; a signed-out client may be asked to show they're a person first. Clients can also comment on any block. The space's viewer analytics show its visits.
3. When the decision comes back and they tell you, record it under Decisions. A request for changes is a revision (step 7).

## 9. Hand it to a developer

When they say "hand it off", "send to Claude Code", "build this" or "for the dev", read references/handoff.md and add its folded "For developers" section: the tokens, the components and their states, the screens and flows, and the decisions. Then tell the person that a coding agent with access to the space can pull its source into a repository with `npx -y spacesheep@latest read <the space's link> -o <folder>`. The design is the source: nothing has to be rebuilt from screenshots.

## 10. Saving a look as a brand

When they say "save this look", "make this our brand" or "use this style for everything":

1. Write a design system note from the design's tokens, in the format in references/brand.md: colours as hex with their roles, fonts, corners, spacing, tone, and do's and don'ts.
2. Put the note in your reply as one block to copy. Tell them to paste it into Settings → Design systems, where they can name it and share it with their team. You don't save it yourself.
3. If design systems aren't on for their account, say so once and keep the note on the space in a folded section, so it isn't lost.

## Limits: what to say instead

| They ask for | Say and do |
|---|---|
| Change words by hand | "Open ⋯ → Edit and type straight into the space; it's saved as a new version." |
| Drag, resize or align boxes by hand | "Comment on the block with what to move, or say it here; I'll make the change." Offer the tweaks panel (assets/tweaks.html) for colour, size and spacing. |
| PowerPoint or Google Slides | "The space has a PDF download, and a deck here plays on any phone. There's no PowerPoint or Slides export." |
| Import a Figma file, a .zip or 3D files | "Paste the HTML, tokens or colours here, or describe the screens; I'll rebuild it here." |
| Branches | "Each direction in the switcher is a branch you can compare, and every version stays in history." |
| Live co-editing | "Share it with edit access: they can change words in Edit mode and comment on any block." |

## The tweaks panel (optional)

When the person wants to explore colour, spacing, corners or type size themselves, add the panel from assets/tweaks.html. Its file says how it works. In the Design workspace, anyone who can edit the space finds its controls under Tweaks, and closing Tweaks saves what they changed as a new version, for the direction on show. Those values sit in `<style data-ss-id="ss-style">` as `!important` rules: change or remove them there when you change the same tokens. If they send back values the panel copied instead, write them into `:root` in a new version. Remove the panel before the space goes to a client.

## Worked examples

**"Brand sheet and logo attached. We need a flyer for Harbour Lane Library's winter talks: a title, four talks with dates and speakers, the address and a book-a-seat button. People will read it on a phone, and we'll pin it up printed on one A4 page."**
1. List the facts: the title, 4 talks each with a date and a speaker, the address, a book-a-seat button. List the constraints: phone, one A4 page, the brand sheet, the logo. Read the brand sheet into tokens (references/brand.md), and paste the logo SVG inline.
2. Make one design, because the brand and content are fixed. It needs a title block, the four talks as a list with the date first, the address, and the button styled as the brand's primary. Add `@page { size: A4; margin: 12mm }` and the Download PDF button, and keep the whole flyer within about 700 × 1,030 px.
3. Render the draft and check: 4 talks, every colour a brand token, nothing wider than 390 px, the flyer fits one A4 sheet. Then publish and reply: "Flyer in your brand. I wrote the title as 'Winter talks at Harbour Lane'. Comment on any block with @shepherd to change it."

**The comment "@shepherd just the date and the title, and make the dates our navy", pinned on the talks list.**
Edit only inside `talks`: cut each talk to its date and title, keeping every id. Set the dates' colour to `var(--brand-ink)` and check its contrast. Touch nothing else. Publish, and reply in one line with both changes. The reply lands under the comment; leave the comment for the person to resolve.

**"We need a landing page for Tidewell, an app that tells small-boat owners when their mooring fees are due and lets them pay from a phone. It's £6 a month, and the first month is free. Give me three directions I can flick between."**
1. List the facts: due-date reminders, paying from a phone, £6 a month, first month free. No brand was given, so choosing the looks is part of the job.
2. Read references/directions.md. Make three directions, each different from the others in layout, type and colour and each with every fact, in one space with the switcher, and name each one.
3. Check each direction at 390 px, then publish. Reply with the three names and one line each.
Then "The third one, but bolder. Don't touch the words." Change only the type and colour tokens on the third direction's section. Check its contrast again, make it the direction the space opens on, and add a line to Decisions.

## Files

- references/brand.md: reading a brand sheet into tokens, the brand check, and the design system note format. Read it whenever a brand is given or asked for.
- references/directions.md: making directions differ and naming them. Read it before any set of directions.
- references/prototypes.md: screens, navigation and state in one space. Read it before any clickable prototype.
- references/handoff.md: the "For developers" section. Read it before a hand-off.
- references/coverage.md: how this skill answers what people used Claude Design for and what they miss. It's background for whoever maintains this skill, not needed for a turn.
- assets/switcher.html: the direction switcher to copy into the space.
- assets/tweaks.html: the optional tweaks panel to copy into the space.
