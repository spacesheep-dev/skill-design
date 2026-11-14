# Questions before drawing

Read this when SKILL.md section 1 says to ask. You ask once, as one form, and end the turn. Drawing starts on the answers or on "Just go".

## What to ask

Only what the request leaves open and what would change the design: the look, who it's for, what leads, the main action, one design or three directions, a must-have it doesn't name. Never what the request, the brand or the space already answers. When section 1's brand question is open ("our brand", with nothing to read), it is one of them.

- At most 4 questions, each with 2 to 4 choices of 1 to 4 words (the chat takes at most 60 characters a choice, 200 a question).
- The first choice is your pick, and the others really differ from it. In a chat form, `"pick"` names it and it opens selected: write it word for word as in `options`, or it is dropped and the question opens with nothing chosen. Elsewhere it is labelled in words: "Warm and homely (my pick)".
- `other: true` where a free answer helps (a must-have, a name), `multi: true` where several fit. Ids are short words: `look`, `leads`.

## Where it goes

Where the request came from:

1. **The page's chat** (you are the person's open session and answer with `spacesheep talk reply`): words that make sense alone, then one `ss-blocks` fence with a `form` (id `brief`, submit "Start designing") and an `actions` button "Just go" whose reply is "Just go: use your picks". Each example below is a whole message. Through the CLI, send it as `--blocks` with the fence's list, the words as a first `{"text": {"markdown": "…"}}` block, in single quotes and each apostrophe written `'`: backticks in a command are read as one to run.
2. **Your own question tool** (Claude Code's AskUserQuestion, with the person at your terminal): the same questions and choices in one call, your pick labelled "(my pick)". It adds its own free answer.
3. **Anywhere else:** the same questions numbered, each choice lettered with your pick first and labelled "(my pick)", ending "Reply go to use my picks."

Then end the turn. A run nobody answers gets no questions (section 1). In the chat, Start designing sends your pick for every question the person left untouched.

## The answers

The form comes back as one line per question, `<question>: <answer>`. Write each into `draw/BRIEF.md` as `choice: <question>: <answer>` (without "(my pick)", where you wrote it). "Just go" or "go" means your pick in each. An answer that names content ("Opening hours", a price typed in) is a `fact:` line instead, in the words the page must show. check.js reads only the `ask:`, `fact:` and `not:` lines, so a choice guides the drawing and is never checked.

Show them on the page: in step 2's message, a third Edit fills the switcher's second line, which shows only once it holds words. Each answer in 1 to 3 words:

```html
<p class="switcher-answers">From your answers: Warm and homely · Baked today · Order for pickup</p>
```

A client copy drops the line (references/after.md).

## A landing page

"Make a landing page for my bakery, Crumb and Co."

Four quick choices before I draw: the feel, what leads, the main button and what it must show. My picks are chosen already: change any and press Start designing, or Just go.

```ss-blocks
[
  {"form": {"id": "brief", "submit": "Start designing", "asks": [
    {"id": "look", "question": "How should it feel?", "options": ["Warm and homely", "Clean and modern", "Bold and playful"], "pick": "Warm and homely"},
    {"id": "leads", "question": "What leads the page?", "options": ["Baked today", "Ordering ahead", "Our story"], "pick": "Baked today"},
    {"id": "action", "question": "What is the main button?", "options": ["Order for pickup", "Find us", "Call the shop"], "pick": "Order for pickup"},
    {"id": "must", "question": "What must it show?", "options": ["Opening hours", "Prices", "Allergens"], "pick": "Opening hours", "multi": true, "other": true}
  ]}},
  {"actions": {"items": [{"label": "Just go", "action": {"reply": "Just go: use your picks"}}]}}
]
```

On "Just go", the brief gains `choice: How should it feel?: Warm and homely`, `choice: What leads the page?: Baked today`, `choice: What is the main button?: Order for pickup` and `fact: Opening hours`.

## A prototype

"Prototype the class booking flow for our yoga studio's app, Stillpoint."

Four quick choices before I draw: who books, how far it goes, one design or three, and anything it must have. My picks are chosen already: change any and press Start designing, or Just go.

```ss-blocks
[
  {"form": {"id": "brief", "submit": "Start designing", "asks": [
    {"id": "who", "question": "Who is booking?", "options": ["Members with a pass", "First-time visitors", "Both"], "pick": "Members with a pass"},
    {"id": "reach", "question": "How far should it go?", "options": ["Class to confirmed", "Through payment", "Also cancel and rebook"], "pick": "Class to confirmed"},
    {"id": "count", "question": "One design or options?", "options": ["One design", "Three directions"], "pick": "One design"},
    {"id": "must", "question": "Anything it must have?", "options": ["A waitlist", "Class reminders"], "pick": "A waitlist", "multi": true, "other": true}
  ]}},
  {"actions": {"items": [{"label": "Just go", "action": {"reply": "Just go: use your picks"}}]}}
]
```

Without a chat form, the same questions read:

```text
Four quick choices before I draw:
1. Who is booking? a) Members with a pass (my pick) b) First-time visitors c) Both
2. How far should it go? a) Class to confirmed (my pick) b) Through payment c) Also cancel and rebook
3. One design or options? a) One design (my pick) b) Three directions
4. Anything it must have? a) A waitlist (my pick) b) Class reminders, or say what
Reply go to use my picks.
```
