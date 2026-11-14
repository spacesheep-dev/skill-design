# After the build: approval, hand-off, brand, limits

Read the part you need when the person asks for it. Each change is still shown before it's saved, as in SKILL.md's order of work.

## Approval from a client

When the person wants sign-off ("send it to the client", "get approval", "I need a yes from Noor"):

1. Make a client copy without the `ss-chat`, `ss-workspace` and `ss-canvas` metas and without the Tweaks pane (`<details class="tweaks">`), so it opens on the design alone, one direction at a time. Add an approval form near the end; the platform sends it from anyone who can open the space, with or without an account:
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
2. Tell the person how it works: they share the link, and the client needs no account. Each answer is emailed to them and kept in the space's private records. Clients can comment on any block too.
3. When the decision comes back, record it under Decisions. A request for changes is a revision (SKILL.md, section 7).

## Hand it to a developer

When they say "hand it off", "send to Claude Code", "build this" or "for the dev", read references/handoff.md and add its folded "For developers" section. Then tell the person that a coding agent with access can pull the source with `npx -y spacesheep@latest read <the space's link> -o <folder>`.

## Saving a look as a brand

When they say "save this look" or "make this our brand": write a design system note from the tokens in the format in references/brand.md, and put it in your reply as one block to copy. Tell them to paste it into Settings → Design systems. You don't save it yourself. If design systems aren't on for their account, say so and keep the note on the space in a folded section.

## Limits: what to say instead

| They ask for | Say and do |
|---|---|
| Change words by hand | "Open ⋯ → Edit and type straight into the space; it's saved as a new version." |
| Drag, resize or align boxes by hand | "Comment on the block with what to move, or say it here; I'll make the change." Point to Tweaks for colour, spacing and the other controls. |
| PowerPoint or Google Slides | "The space has a PDF download, and a deck here plays on any phone. There's no PowerPoint or Slides export." |
| Import a Figma file, a .zip or 3D files | "Paste the HTML, tokens or colours here, or describe the screens; I'll rebuild it here." |
| Branches | "Each direction in the switcher is a branch you can compare, and every version stays in history." |
| Live co-editing | "Share it with edit access: they can change words in Edit mode and comment on any block." |

## Tweaks

The controls (SKILL.md section 3) show as Tweaks beside the design. Closing Tweaks saves the person's values as a new version, in `<style data-ss-id="ss-style">` as `!important` rules for that direction. "Keep these" saves them too and tells the chat which they settled on. When you change one of those tokens yourself, change or remove its rule there. On a page opened without Spacesheep's workspace, the pane shows on the page, and its "Copy for the chat" gives the same "Keep these for …" line to paste.
