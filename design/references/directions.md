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
| Imagery | Illustration drawn in SVG or CSS | Type and colour only, no imagery |
| Voice of the headings | Warm and personal | Crisp and factual |

With a brand given, all three directions use the brand's colours, fonts and logo. They differ in layout, lead, density, shape and how the brand's colours are balanced (mostly ground, mostly accent, mostly ink).

## A way to get three

1. **Safe:** the clearest version of what the request describes. A visitor finds every fact in seconds.
2. **Bold:** the same facts with one strong idea pushed hard, such as a huge type headline, a dark field, or one striking illustration.
3. **Unexpected:** a different structure, such as a price table as the hero, a single card, a story told in steps, or an editorial layout.

Then check each against the axes table and change whatever two of them share.

## Naming

- 1 to 3 words that name the idea: "Harbour Chart", "Night Watch", "Logbook", "Paper Lantern".
- Never "Option A", "Version 2", "Modern" or "Clean": those name nothing.
- One line under each name says who it's for or what it leads with: "Lead with the due date; for owners who only open it when a bill comes."

## Every direction is complete

- Every direction keeps its own tokens on its own section (`[data-ss-id="direction-night-watch"] { --brand-accent: …; --font-display: … }`). A revision to one direction changes only its section's tokens.
- Every fact from the request is in every direction. Don't drop the price from the bold one to make it look cleaner.
- Every direction works at 390 px wide and has working links and buttons.
- Every direction gets its own `data-ss-id` prefix (`chart-hero`, `nightwatch-hero`), so a comment says which one it's about.

## Mistakes to avoid

- Three colour swaps of one layout.
- One strong direction and two weak ones, made to push the person towards the strong one.
- A direction that breaks the brand's own rules.
- Directions that need explaining: if you need a paragraph to say why it's different, it isn't different enough.
- Changing all three when the person comments on one.

## After the pick

- A pick with a change ("the third, but bolder"): change only the third, make it the one the space opens on, and leave the others untouched.
- "Go with the third": remove the other directions and the switcher in one new version, and record the pick in Decisions. Older versions still hold the others.
- "Mix them" ("the layout of one with the colours of three"): add it as a new direction named for what it combines, and keep the originals until they choose.
