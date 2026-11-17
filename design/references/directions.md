# Directions: three that really differ

Read this before making any set of directions.

## What makes directions different

A direction is a different answer to "what should this feel like, and what should it lead with". Two directions that differ only in colour are one direction. Make each pair differ on at least three of these axes:

| Axis | One end | Other end |
|---|---|---|
| Layout | One long column, one idea per screen | A dense grid, everything visible at once |
| Lead | The product or the facts first | The promise or a story first |
| Type | A serif or display face, large and expressive | A plain sans, small and quiet |
| Colour ground | Light ground, colour as accent | Dark or saturated ground, colour as field |
| Density | A lot of air, few elements | Information-rich, many elements |
| Shape | Soft: round corners, organic shapes | Hard: square edges, rules and lines |
| Imagery | Shapes, rules and colour fields drawn in CSS | Type only, no imagery |

With a brand given, all three directions use the brand's colours, fonts and logo. They differ in layout, lead, density, shape and how the brand's colours are balanced (mostly ground, mostly accent, mostly ink).

## A way to get three

Take each direction from a different source, then give each its own skeleton:

1. **The subject:** what the thing does for the person, made visible (a ledger for comparing, steps for a setup, a feed for what's new).
2. **The brand found in the product:** its own colours, type and habits, pushed further than the product dares.
3. **A deliberate departure from both:** a structure neither of the others uses, such as one card at a time, a single dense table, a story told in steps, or an editorial front page.

A skeleton is the page's arrangement: one column, a lead item over a list, a grid, a table, steps, a split screen. Before you write the three lines, check that no two share a skeleton, and rewrite one that does: colour and type alone make one direction.

## Naming

- 1 to 3 words that name the idea: "Harbour Chart", "Night Watch", "Logbook", "Paper Lantern".
- Never "Option A", "Version 2", "Modern" or "Clean": those name nothing.
- One line under each name gives its skeleton and what it leads with: "A ledger of every bill, due date first; for owners who only open it when one comes." A card grid in new colours is no idea.
- Name a direction for its idea, never for the product's own name or metaphor: a page called Orbit gets no star charts.

## Every direction is complete

- Every direction keeps its own tokens on its own section (`[data-ss-id="direction-night-watch"] { --brand-accent: …; --font-display: … }`). A revision to one direction changes only its section's tokens.
- Every direction shows the same real content: the request's facts and the same headline, words, items and numbers, so the pick is about structure, not copy. Don't drop the price from the bold one to make it look cleaner.
- Every direction works at 390 px wide and has working links and buttons.
- Every direction gets its own `data-ss-id` prefix (`chart-hero`, `nightwatch-hero`), so a comment says which one it's about.

## Mistakes to avoid

- Three colour swaps of one layout.
- A "safe" direction that is the default template: a hero, three feature cards and a cream page. Safe means clear, not generic; the look in SKILL.md's Never list is out in every direction.
- One strong direction and two weak ones, made to push the person towards the strong one.
- A direction that breaks the brand's own rules.
- Directions that need explaining: if you need a paragraph to say why it's different, it isn't different enough.
- Changing all three when the person comments on one.

## After the pick

- A pick, with a change or without ("go with the third", "the third, but bolder"): change only the third, mark it chosen (`data-chosen`), make it the one the space opens on, point the canvas at it (`fold.js focus <slug>`), record the pick in Decisions, and leave the others untouched. The canvas shows the pick large, and the others stay to compare or come back to.
- "Drop the others" ("just the third", "delete the rest"): only then remove the other directions and the switcher's tabs and script, in one new version (keep its nav while it holds Tweaks or the answers line), point the canvas at the one left, and record it in Decisions. Older versions still hold the others.
- "Mix them" ("the layout of one with the colours of three"): add it as a new direction named for what it combines, and keep the originals until they choose.
