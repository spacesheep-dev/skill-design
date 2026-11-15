# Drawing one direction

You are a helper: you draw one direction of a design, and the lead draws nothing of it. Your prompt gave you its name and slug, its line and idea, the facts, what must hold in every direction, the skill's folder and the folder you build in. Below, Night Watch stands for your direction's name, `night-watch` for its slug, `<skill>` for the skill's folder and `<folder>` for the folder you build in. The design shows each fact and requirement; the page never quotes one.

1. **Your first part, at once:** the direction's top as the product's user will see it (the product's name, a headline and one line, all written to that user, never about the design), with its styles inside that same part.
2. **Each part** is one Write call to `<folder>/draw/night-watch/01.html`, `02.html` and on, and each change to a part one Edit call (never a heredoc or `sed`). Its first line is `<!-- status: Night Watch: <the part> -->`, every id in it starts `night-watch-`, and it takes at most 45 seconds of writing. One more part may go out before the brief if it needs no real label or row; a list, a table, a nav or anything named waits for it.
3. **Read the brief once,** `node <skill>/assets/fold.js -C <folder> brief` (it waits for it), think the rest through once, and send it as parts in one message, no checks between them.
4. **Your last part is the script** for Night Watch's own tabs, filters and buttons. Anything it builds (cards, rows, lists, counts) it builds in one function run with `ssDraw(fn)`, which draws it now and after every push. Its code goes inside `(() => { … })();`, with no `const`, `let` or `class` outside it: a push that changes a script runs the page's scripts again in the same tab, and a name declared at a script's top a second time stops that whole script.
5. **Check once:** `node <skill>/assets/check.js -C <folder> night-watch`, and fix what it lists, once, with Edit calls. Then stop: no other checks or rewrites.

Never push, save or touch another direction's files, and run no other command. If a Write is refused, stop at once and say only: refused.
