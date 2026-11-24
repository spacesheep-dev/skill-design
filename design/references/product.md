# A screen in an existing product: its look and its chrome

Read this when the design is a screen, page or panel inside a product that already exists: its code is in this folder or one the person names (Spacesheep, their dashboard, their app). The screen must look like the rest of that product, so its look and its chrome come from the code, and the directions differ only in the screen itself.

## 1. The look file, before the helpers

In one message, before step 2's frame and its helpers (or, without helpers, before your own tops in step 4): a Glob for the theme, type, button and shell (header, sidebar, nav) files, a Grep for colour tokens and font families, then Read the 3 to 5 files they point to, including the screen nearest the one asked for. Then write `draw/DESIGN.md` in one Write, at most 80 lines, every value copied from the code:

| Part | What it holds |
|---|---|
| Header | "Taken from <files> on <date>": use these values and parts, never a new palette, font or button |
| Type | the families, the title, section and body sizes and weights, mono only where the app uses it |
| Colour | a table, role and value: ground, surfaces, the text levels, borders, the one accent, success and danger, and what each colour means. When the app has a dark theme, a Dark column beside it from the theme's dark block, buttons too |
| Shape | corners and shadows by kind (cards, menus, buttons, badges) |
| Buttons | each kind the app has, its face, edge and ink, and its sizes |
| Parts | the app's header, sidebar, breadcrumb, tabs, badges, segmented control, avatar, empty state, as the code draws them |
| Today's screen | the nearest screen as it is now, to grow from |
| Voice | how its words sound, with one line from the app |

With it, write `draw/CHROME.html` in the same message: the app's header and sidebar (or bottom bar on a phone) as one block, with the real logo, labels in their order, and the person's avatar, styled only with DESIGN.md's values. Put its tokens on every direction's section (the same values in each) and its styles once in `draw/frame.html`, each selector under the chrome's own root class (`.ss-app .ss-rail-row`), so a direction's link and button rules can't recolour it. No colour in a `style` attribute (check.js flags it): give it a class there. The logo goes once in the frame as `<svg style="display:none"><symbol id="…-logo">…</symbol></svg>` (an svg ignores `hidden`), and CHROME.html draws it with `<use href="#…-logo"/>`, so three directions don't carry three copies.

Each helper's lines then add: "The product's look: read `<folder>/draw/DESIGN.md` and `<folder>/draw/CHROME.html` first."

## 2. Inside the real chrome

Each direction is the screen as it sits in the app: CHROME.html first, as it is, with the current place marked in its nav, and the screen in its content area. Never a poster, a landing page or a header of the design's own. A menu the screen needs (the account menu, a create menu) is the app's menu, drawn from its code, and opens over the screen as it does in the app.

## 3. Directions differ in the screen, not the look

Every direction keeps DESIGN.md's type, colours, buttons and chrome. They differ in what leads, how it is grouped and laid out, and what each state shows. A direction that wants a new colour or font is another product: leave it out.

## 4. States from the product

The Prototype bar's states (SKILL.md section 3) are the product's real cases, in the app's words: who looks (the owner or someone else), admin or not, signed in or out, public or private, empty or full, a menu open, light or dark when the app has both. A menu state opens the real menu over the screen.

- **Dark, when the app has a dark theme:** a Theme switch (`--dark`, Light|Dark) that draws the whole screen dark, the chrome too: every direction's section redefines its tokens and the chrome's with DESIGN.md's Dark column under `[data-ss-id="direction-<slug>"][data-dark="1"]`. So no colour in a part may be a literal (a white card, a tint, a shadow): each is a token, or the dark state leaves a light patch. Only the bar keeps its own light or dark.
- **What a state hides is never a link in it.** When Private hides the files, a fact that pointed at a file is plain text there, as the app does; the same for an author's page with nothing on it, or an action only the owner has.

## 5. Real data, and Sample where it is made up

Names, handles, labels and counts the code or the request gives are real. Anything else you invent (activity counts, a chart's weeks, numbers of installs) gets a `sample:` line in the brief and its Sample marks.
