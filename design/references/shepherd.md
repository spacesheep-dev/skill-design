# Design in a Shepherd turn

Read this when you have no shell (a Spacesheep Shepherd turn): no fold.js, check.js, helpers, parts or pictures. You read this skill's files with `use_skill` (`file`, and `offset` for the next part), and the page you write is the design. This page replaces SKILL.md's Order of work. Its sections 1 to 4, 6 and 7 still say what to make and how to answer.

## Turn 1: the page, with the questions on it

For a new design on a blank page (or one showing only this skill's starter), read references/questions.md and `assets/shepherd.html` with `use_skill`, in one step, unless SKILL.md section 1 says to ask nothing. These questions are the real ambiguity your own rules tell you to ask about, so ask them even when the request is a few words. They go on the page, never in the chat.

Your `@page` is shepherd.html, copied whole from `<!DOCTYPE html>` to `</html>`, with only two changes:

1. **The title:** the space's own, in `<title>` (SKILL.md section 2: the title is the person's).
2. **The questions card** (`<div class="ss-questions" …>`, first in the body): its two example questions become yours, as questions.md says what to ask. Each is a `<fieldset>` with the question in its `<legend>` and a `<label><input …>Choice</label>` per choice, your pick first and `checked`. One answer: `type="radio"`, with the question's id as every input's `name`. Several (`multi`): `type="checkbox"`. A free answer (`other`): keep the text `<input>` after its choices. Keep the heading, the line under it and the button as they are.

Write it in order, as it streams onto the person's screen: the card shows within seconds, and the canvas fills in under it. Leave the three sections, the bar, both `<style>`s, the script and the end mark exactly as they are: the button stays off until the page is whole. Then reply in one line: "Pick on the page, then press Start designing." End the turn.

## Turn 2: the answers make the design

The button sends "Start designing with my answers." and one answer per question (a typed answer comes last). On those, or on "go" (your picks), read the page once with `read_document_source` (`limit` 32000), then make the design with `edit_document_source`, in one call, copying each `old` exactly from what you read:

1. **The card:** `<div class="ss-questions` becomes `<div hidden class="ss-questions`.
2. **The tokens:** the `<style>` after the bar, with its three token rules, becomes each direction's tokens under its own selector (section 3, Tokens first). After it, one `<style>` per direction with every rule under `[data-ss-id="direction-<slug>"]`. This page has none of the kit's parts (`.k-bar`, `.k-hero`, `.k-cards` and the rest): where section 3 says to build from the kit, write those blocks and their styles yourself, under the same selector. Phone rules use `@container (max-width: 40rem)`, never `@media`, and sizes in `cqi`, never `vw`.
3. **Each section**, from its opening tag to its `<!-- /part:first -->`: the slug in `data-ss-id="direction-<slug>"` and `data-ss-thing="direction/<slug>"`, the name in `data-ss-label`, the line in `data-line`; the card menu after the name (`Menu for <name>`, `Use <name>`, `Another round of <name>`); and the `<div class="drawing" …>` between the marks becomes the direction's design, its blocks with `data-ss-id="<slug>-<part>"`, the marks with the slug (`<!-- part:harbour-chart -->`). For one design, the other two sections become nothing.
4. **The controls:** up to 6 `<label>Name <input …></label>` before the Keep these button, inside `.tweaks-body` (section 3, Controls from this design). Every direction sets each control's token.
5. **The answers:** `<p class="switcher-answers"></p>` holds them, each in 1 to 3 words (questions.md, The answers).

Add no canvas, tabs or bar of your own. Keep each direction to about 4,000 characters. The page shows the design when the turn ends. Then reply as section 6 says.

## After that: edits

The page now has a version, so change it with `read_document_source` and `edit_document_source`, in small edits (section 7). When the person picks a direction ("Use Harbour Chart"), put `data-chosen` on its section and set `<meta name="ss-canvas-focus">` to `direction-<slug>`. When they ask for alternatives again, set it back to `all`.
