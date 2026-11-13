# Clickable prototypes in one space

Read this before building any prototype ("clickable", "tap through", "mock up the screens", "an app flow").

## The shape

- **One space, many screens.** Each screen is a `<section class="screen" data-ss-frame="phone" data-ss-section data-ss-id="screen-<name>" data-ss-thing="screen/<name>" data-ss-label="<Screen name>">`. Every screen stays visible on the working canvas. Without the canvas meta, the client copy shows only the current screen. The `data-ss-thing` path keeps comments on a screen while another one is showing (the house rule for parts that move). Name the parts people will talk about the same way: `data-ss-thing="screen/passengers/row-child"`.
- **Navigation by hash.** A link to `#screen-passengers` moves to that screen, and the back gesture goes back. The browser history does the work, so you don't need a router.
- **Phone frames in the review.** Mark each screen `data-ss-frame="phone"` so Spacesheep frames it at 390 × 844. Without the canvas meta, the client copy uses one centred device frame on wide screens and fills the viewport on a phone.
- **Start on the first screen.** With no hash, show the first one. With an unknown hash, also show the first one.

```html
<style>
  .screen { display: none; min-height: 100dvh; }
  .screen.on { display: block; }
  html:has(meta[name="ss-canvas"][content="on"]) .screen { display: block; min-height: 0; }
  html:has(meta[name="ss-canvas"][content="on"]) .device { display: contents; }
  @media (min-width: 600px) {
    .device { width: 390px; height: 844px; margin: 24px auto; border-radius: 40px; overflow: auto; outline: 10px solid var(--brand-ink); }
    .screen { min-height: 100%; }
  }
</style>
<div class="device">
  <section class="screen" data-ss-frame="phone" data-ss-section data-ss-id="screen-route" data-ss-thing="screen/route" data-ss-label="Route">…<a href="#screen-passengers" class="btn">Choose passengers</a></section>
  <section class="screen" data-ss-frame="phone" data-ss-section data-ss-id="screen-passengers" data-ss-thing="screen/passengers" data-ss-label="Passengers">…</section>
  <section class="screen" data-ss-frame="phone" data-ss-section data-ss-id="screen-pay" data-ss-thing="screen/pay" data-ss-label="Pay">…</section>
</div>
<script>
  (() => {
    const screens = [...document.querySelectorAll('.screen')];
    const show = () => {
      const id = location.hash.slice(1);
      const on = screens.find(s => s.dataset.ssId === id) || screens[0];
      screens.forEach(s => s.classList.toggle('on', s === on));
      on.scrollTop = 0;
    };
    addEventListener('hashchange', show); show();
  })();
</script>
```

## State that really works

Keep state in one small object in an inline script, and draw from it. A rule written in the request is a rule in the code:

- "Up to four passengers on a ticket": a fifth tap on + is refused. The control shows "Up to 4", and the total reads "4 of 4".
- "Pick a sailing date": a real `<input type="date">` with the date shown in words beside it, or a row of day buttons when asked.
- A form validates what it says it needs, and its submit button moves to the next screen.
- Store choices in `sessionStorage` so going back keeps them. Clear them on the first screen's "Start over".

## Every screen

- has a clear title and one main action, at least 44 px tall, within thumb reach near the bottom;
- has a way back or onward, so there are no dead ends;
- shows real content: real routes, real prices, real copy;
- carries the brand tokens like any other design;
- shows its other states where the flow has them: empty (a headline, one line saying why, and the next action), loading, error (what went wrong in plain words, a way to retry, and the person's input kept) and done. Give a way to reach each one, such as a search that finds nothing or a card that's declined.

## Checking it

Walk it in your head from the first screen to the last, tapping every control. Then check the rules (try a fourth pick), the back path, and the empty and error states. Render the draft at phone size, and check that no screen scrolls sideways.

## Revisions

- "Add a Help link on every screen": add it to each screen in the same place, so it reads as one control.
- "Day buttons instead of the date field": replace only that control and its read-out. Keep the screen's ids and everything else.
