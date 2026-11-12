# Brand: from a sheet to tokens, the check, and the note

Read this whenever the person gives you a brand (a design system, a brand sheet, a logo, colours) or asks you to save one.

## 1. Where a brand comes from, and which wins

1. **A design system block in your instructions.** The space is built in that system. It wins over everything below, and over the house defaults (white ground, system font). The house rules for phones, contrast and structure still hold.
2. **A brand sheet in this conversation.** It might be a markdown note, a pasted list of colours and fonts, a PDF's text, or a logo SVG. Read it in full.
3. **An existing space of theirs** ("like our homepage"). Read its CSS for colours, fonts, corners and spacing, and its words for tone.
4. **Nothing.** Choose a look on purpose and name it in your reply.

If two sources disagree (the design system says navy and the sheet in chat says green), use the design system and say which one you used. If they meant the sheet, they will tell you.

## 2. Turning a sheet into tokens

Write every brand value as a CSS variable in `:root`, named by its role. Use the sheet's own names in a comment beside each one.

```css
:root {
  --brand-ink: #1f2a24;      /* "Forest" (text) */
  --brand-ground: #f3f5f2;   /* "Chalk" (background) */
  --brand-accent: #d9643a;   /* "Ember" (accent, buttons) */
  --brand-muted: #6b7a70;    /* derived: ink at 65% on ground */
  --font-display: "Libre Baskerville", "Iowan Old Style", Georgia, serif;
  --font-body: "Source Sans 3", system-ui, -apple-system, "Segoe UI", sans-serif;
  --radius: 10px;
  --space: 8px;              /* spacing unit; use multiples */
}
```

- **Colours:** keep every hex exactly as given. When the sheet gives roles (primary, accent, text), map them to roles. When it only gives a list, use the darkest for ink, the lightest for ground, and the most saturated for the accent, and say so in your reply.
- **Derived colours** (muted text, borders, hover) are mixes of the brand's own colours (`color-mix(in srgb, var(--brand-ink) 65%, var(--brand-ground))`), never new hues.
- **Fonts:** name the brand font first in the stack, then the closest faces most phones have. Inline the font with `@font-face` only when they gave you the file. If they didn't, say "set in a close system font; send the font file to use the real one".
- **Logo:** paste their SVG inline as given. Size it with CSS. Never redraw it, recolour it, or put it on a ground that fails its own contrast. A logo in a format other than SVG goes in only as their own uploaded image. Otherwise leave a clearly labelled space for it and say so.
- **Tone:** if the sheet describes a voice ("warm, plain, no exclamation marks"), write the copy that way.
- **Rules:** do every "always" and avoid every "never" in the sheet (for example, "never put the logo on the accent colour").

## 3. The brand check (before every publish)

1. Search your CSS for every colour (`#`, `rgb(`, `hsl(`, named colours). Each one is a brand token, a mix of brand tokens, or pure white or black. Replace any other colour.
2. Every `font-family` uses `--font-display` or `--font-body`.
3. The logo is their SVG, unchanged, at a size where it can be read (at least 24 px high on a phone).
4. Text on every background passes AA: 4.5:1 for body text, 3:1 for 24 px and larger. Check the accent button's text especially. If the brand accent fails with white text, use the ink colour on it, or a darker mix of the accent, and say so.
5. Nothing in the sheet's "never" list happens anywhere in the design.

## 4. The design system note (for "save this look")

A design system is a short Markdown note the person keeps in Settings → Design systems. Write it like this, and give it to them as one block to copy. You never save it yourself.

```markdown
# Harbour Lane Library

## Colours
- Navy #1d2b45: text and icons
- Paper #f4f5f7: background
- Signal #e8b021: buttons and highlights, never behind the logo
- Slate #5d6878: secondary text

## Type
- Display: Libre Baskerville, bold, for titles only
- Body: Source Sans 3, 16 px and up, 1.5 line height

## Shape and space
- Square corners; cards have a 1 px Slate rule above, no shadow
- Spacing in steps of 8 px; wide margins

## Tone
- Friendly and exact. Dates before titles. No exclamation marks.

## Do and don't
- Do lead with what's on and when.
- Don't use stock photos or drawings; let the type and the talks carry it.
```

Keep it under about 60 lines. Write rules in plain words, one `#` heading per part, and give every colour as a hex code with its job.
