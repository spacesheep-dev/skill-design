# Coverage: what people used Claude Design for, and what they miss

Background for whoever maintains this skill; a turn doesn't need it. Source: vsm's research, "Claude Design → Claude: how people use it and what they're losing" (X posts, 10 Nov 2026, 20 findings). Findings 1 to 9 are what Claude Design was used for; 10 to 20 are what people are losing.

Status: **Covered** means the skill's words do it with today's Spacesheep. **Partly** means some of it, with the gap named. **Not covered** means a skill's words can't deliver it: it needs the platform.

| # | Finding | What the skill tells the agent | Spacesheep feature it leans on | Status |
|---|---|---|---|---|
| 1 | A brand design system anyone in the company can use | Step 1.2: a design system block wins over every default; references/brand.md turns a brand sheet into tokens and checks every colour, font and the logo before publishing. | Design systems (Settings → Design systems), shared with teams; the design block every turn on a space built in one gets | Covered |
| 2 | Prompt to clickable prototype, then hand to Claude Code | Step 4 and references/prototypes.md: screens as sections, hash navigation, working state. Step 9 and references/handoff.md: tokens, components, flows; the coding agent pulls the source with `spacesheep read`. | Self-contained HTML spaces; the Spacesheep CLI's `read` | Covered |
| 3 | Faster, better-looking UI than a coding agent alone | What good looks like, step 3 (tokens, phone first, real content), step 5 (checks), references/directions.md. | Shepherd's draft render; house Design Standards | Partly: the words aim at it; only the bench (SKILL-65) can show whether it's better or faster |
| 4 | Slide decks, then Google Slides to collaborate | Step 4 "Deck": house presentation rules plus brand, directions and review loop. Limits table: PDF download, no Slides or PowerPoint export. | Slides in spaces; PDF download; comments | Partly. Needs the platform: export to Google Slides or PowerPoint |
| 5 | Self-contained HTML to send outside Claude | Step 3: one self-contained document, no CDN fonts or scripts, inline SVG; it plays on a phone and prints. | Every space is self-contained HTML; download; links that open without an account | Covered |
| 6 | Client approvals for agencies and freelancers | Step 8: an approval form (`data-ss-form="approvals"`) saying which version it approves; decisions recorded; changes come back as revisions. | Visitor forms (sent signed in or not, emailed to the owner, kept in the space's private records); pinned comments; viewer analytics; custom domains | Covered |
| 7 | One project as a home for designs, uploads and chat | Step 6: a Decisions log kept on the space; directions live in one space; every change is a version. | Versions with history; comments and the Shepherd thread kept on the space; stacks to group spaces | Partly. Needs the platform: one project holding several spaces, their uploads and their chats together |
| 8 | Motion and animation on a design system | Step 4 "Motion": CSS transitions and keyframes timed with tokens; reduced motion respected; none on a space meant for paper. | Self-contained HTML (CSS and inline script run) | Covered |
| 9 | Solo shipping and big redesigns | Step 1.3: read the space first and keep every word, link and id; Decisions log keeps the reasons; hand-off for building. | Versions; restore; the CLI for a coding agent | Covered |
| 10 | "The standalone version is better": worse designs in chat, prototypes too static | Directions that really differ (step 2), working prototypes (step 4), checks before showing (step 5), one design space rather than a chat reply. | Spaces as the canvas; Shepherd on the space | Partly: quality is for the bench to judge, not for this table |
| 11 | Chats and comments deleted; moving projects isn't automatic | Step 6: decisions written onto the space, so they travel with the HTML. Limits table: paste the HTML or tokens to rebuild here. | Comments and Shepherd thread are kept with the space; versions | Partly. Needs the platform: importing a Claude Design project export (a .zip) with its comments |
| 12 | Shared public links stop working | Nothing in the skill breaks a link: revisions are new versions at the same address. | A space keeps its address across versions; sharing by link; custom domains | Covered |
| 13 | Sharing with people outside: no-account links, custom domain, view tracking | Step 8 tells the person each answer is emailed and kept, clients can comment, and the analytics show its visits. | Link sharing without an account; custom domains; viewer analytics | Covered (the person sets the sharing; the skill doesn't change it) |
| 14 | Export features lost (HTML download, send to Slides) | Step 3 keeps the space self-contained so the download is the design; step 4 adds the PDF button for paper. | Download as HTML and PDF | Partly. Needs the platform: send to Google Slides |
| 15 | Moving design systems is painful | Step 10 and references/brand.md: a design system note written from any design's tokens, for the person to paste into Settings. Step 1.2 reads a brand sheet pasted from anywhere. | Design systems in Settings | Partly. Needs the platform: importing a Claude Design system export directly, and saving the note without the person pasting it |
| 16 | Lost imports: Figma .fig, .glb and .blend 3D | Limits table: say it can't be imported; ask for HTML, tokens or a description instead. | None | Not covered. Needs the platform: Figma and 3D file import |
| 17 | No version control or undo; wants branches and a changelog | Step 7: each change is a version with a one-line reason (a changelog); undo restores earlier values; variations become new directions rather than overwriting. | Versions with history and restore | Partly. Needs the platform: named branches and a side-by-side compare of two versions |
| 18 | Organisation: folders, tags, finding things | None beyond naming directions clearly. | Stacks and shelves on the dashboard; search | Not covered by the skill's words; the platform's stacks already help. Needs the platform for anything more, such as tags or a project view |
| 19 | Every small change needs a prompt; no hands-on editing | Limits table: change words yourself in Edit mode. Step 7: a comment on the block that mentions @shepherd (or Send to Shepherd, where it shows) starts a turn that makes the smallest surgical change, keeping edits made by hand. Optional tweaks panel (assets/tweaks.html) for colour, spacing, corners and type size without prompting, with values sent back once. | Edit mode (⋯ → Edit) for changing words in place; pinned comments; @shepherd in a comment; "Send to Shepherd" (an experiment, not on every account yet); surgical edits by `data-ss-id` | Partly. Needs the platform: dragging, resizing and aligning boxes on the canvas without a prompt |
| 20 | Weak collaboration and design-to-code handoff | Step 9 and references/handoff.md: the space is the source; a coding agent pulls it with `spacesheep read`; the build is compared block by block. Limits table: share with edit access. | Sharing with edit access; Edit mode; comments; the CLI's `read` | Partly. Needs the platform: designs landing in a repo without a person running a command, and editing layout together (Edit mode changes words) |

## Count

- Covered: 8 (1, 2, 5, 6, 8, 9, 12, 13)
- Partly: 10 (3, 4, 7, 10, 11, 14, 15, 17, 19, 20)
- Not covered: 2 (16, 18)

## If James tried it tonight

What he would see for each finding that is only partly covered or not covered, using today's Spacesheep with this skill.

| # | What he'd see |
|---|---|
| 3 | A finished, phone-first design in one turn. Whether it beats Claude Design waits for the bench. |
| 4 | A branded deck that plays on a phone and downloads as a PDF. Nothing sends it to Slides or PowerPoint. |
| 7 | Each design is its own space with its versions, comments and chat. No project holds several together; stacks only group them. |
| 10 | Three directions to switch between, and prototypes he can tap through. Better than Claude Design is for the bench to say. |
| 11 | The decisions travel inside the space. A Claude Design .zip can't be imported: the agent asks for its HTML or colours. |
| 14 | ⋯ → Download gives the HTML and a PDF. Nothing sends it to Google Slides. |
| 15 | "Save this look" gives him a note to paste into Settings → Design systems. The agent can't save it or read a Claude Design export. |
| 16 | Attach a .fig, .glb or .blend and the agent says it can't open it, and asks for HTML, colours or a description. |
| 17 | Every change is a version he can restore, and a variation becomes an extra direction. No named branches, no side-by-side compare. |
| 18 | Nothing new: his spaces sit in the dashboard's stacks and shelves, with search. No tags or folders. |
| 19 | He types words straight into the space in Edit mode, and tries colour and spacing in the tweaks panel. He can't drag or resize boxes. |
| 20 | A "For developers" section and a one-line `spacesheep read` for a coding agent, which someone still has to run. Others can co-edit words in Edit mode, not layout. |
