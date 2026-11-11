# Handing a design to a developer or a coding agent

Read this before a hand-off ("hand it off", "send to Claude Code", "build this", "for the dev", "ship it").

The design is the source. A developer, or a coding agent such as Claude Code or Codex, pulls the space's HTML into their repository and builds from it. Nobody rebuilds from screenshots.

## Add a folded "For developers" section

At the very end of the space, add `<details class="no-print" data-ss-id="for-developers"><summary>For developers</summary>…</details>` with these parts, in this order:

1. **Version.** "Approved version: v6, 11 Nov." Take it from Decisions, or say it isn't approved yet.
2. **Tokens.** A table of every CSS variable in `:root`: name, value, role. It's the same list as the code, so copy it out exactly.
3. **Components.** Each repeated part (button, card, menu item, nav, form field) gets its name, the `data-component` it uses, its states (default, hover or focus, disabled, error), and where it appears.
4. **Screens and flows** (prototypes): each screen's id, what leads to it, and the rules it enforces ("at most 4 passengers").
5. **Behaviour.** Anything scripted: what it does, its limits, what's stored and where.
6. **Copy that is a placeholder,** listed, so nothing guessed ships as fact.
7. **Decisions.** A link to the Decisions log above, or the key lines copied in.

Name the repeated parts in the HTML with `data-component="button-primary"`, so the list and the code use the same names. (`data-ss-thing` is for keeping comments on parts that redraw, not for this.)

## Tell the person, in one or two lines

> "Hand-off is on the space under For developers. Your coding agent can pull the source with `npx -y spacesheep@latest read <the space's link> -o design/` (signed in to Spacesheep, with the space shared to it), then build from the tokens and components listed there."

If they want the developer to see the design only, share the space's link. If the developer should edit it, share it with edit access.

## When the build comes back

If they bring the built version back (a link, or HTML pasted into the chat), compare it with the approved design block by block: tokens, spacing, copy, states. List the differences in your reply. Don't change the approved design to match the build.
