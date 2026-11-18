# Design in a Shepherd turn

Read this when you have no shell (a Spacesheep Shepherd turn): no fold.js, check.js, helpers, parts or pictures. You read this skill's files with `use_skill` (`file`, and `offset` for the next part), and the page you write is the design. This page replaces SKILL.md's Order of work. Its sections 1 to 4, 6 and 7 still say what to make and how to answer.

## Turn 1: ask, and write no page

For a new design on a blank page (or one showing only this skill's starter), read references/questions.md with `use_skill` and ask the way it says, unless SKILL.md section 1 says to ask nothing. These questions are the real ambiguity your own rules tell you to ask about, so ask them even when the request is a few words.

Write the questions in your reply as a numbered list: each question, then its choices, your pick first and marked "(my pick)". End with: "Answer with the numbers, or say go and I'll use my picks." Write no page this turn (no `@page`, no `create_space`), and end the turn.

## Turn 2: the page is assets/shepherd.html

On the answers, or "go": read `assets/shepherd.html` with `use_skill`. It fits in one read. Your `@page` is that file, copied whole from `<!DOCTYPE html>` to `</html>`, with only these changes:

1. **The title:** the space's own, in `<title>` (SKILL.md section 2: the title is the person's).
2. **The tokens:** in the `<style>` after the bar, each direction's tokens under its own selector (section 3, Tokens first).
3. **Each section's opening tag:** the slug in `data-ss-id="direction-<slug>"` and `data-ss-thing="direction/<slug>"`, the name in `data-ss-label`, the line in `data-line`. The card menu inside it follows the name: `Menu for <name>`, `Use <name>`, `Another round of <name>`. For one design, keep one section.
4. **The drawing:** in each section, the `<div class="drawing" …>` between `<!-- part:first -->` and `<!-- /part:first -->` becomes the direction's design. Its blocks take `data-ss-id="<slug>-<part>"`, and the marks take the slug (`<!-- part:harbour-chart -->`).
5. **Its styles:** one `<style>` per direction, after the tokens, with every rule under `[data-ss-id="direction-<slug>"]`. This page has none of the kit's parts (`.k-bar`, `.k-hero`, `.k-cards` and the rest): where section 3 says to build from the kit, write those blocks and their styles yourself, under the same selector. Phone rules use `@container (max-width: 40rem)`, never `@media`, and sizes in `cqi`, never `vw`.
6. **The controls:** up to 6 `<label>Name <input …></label>` before the Keep these button, inside `.tweaks-body` (section 3, Controls from this design). Every direction sets each control's token.

Leave everything else exactly as it is: the metas (`ss-canvas` is the canvas), the bar, both scripts and the end mark. Add no canvas, tabs or bar of your own.

Write the directions in order, each one's top first, since the page draws on the person's screen as you write. Keep each direction to about 4,000 characters and the whole page under 32,000. Then reply as section 6 says.

## After that: edits

The page now has a version, so change it with `read_document_source` and `edit_document_source`, in small edits (section 7). When the person picks a direction ("Use Harbour Chart"), put `data-chosen` on its section and set `<meta name="ss-canvas-focus">` to `direction-<slug>`. When they ask for alternatives again, set it back to `all`.
