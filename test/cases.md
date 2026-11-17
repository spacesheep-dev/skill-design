# Cases a run must get right

Background for whoever changes the skill's words: no test here can run a model, so these are checked by a real run (the Design bench), not by `node --test`. Each case is a request, what the skill's words must make the agent do, and the run that found it.

| Request | The agent must | Found by |
|---|---|---|
| A walk-in queue page for a ramen bar open 17:30 to 23:00; dark never mentioned | Ask "Dark too, or light only?" in the frame's chat line (SKILL.md section 1, dark mode: used after dark), and draw light while it waits | Bench run of the dark mode rule (brief N1, 17 Nov 2026): it drew light and never asked |
| A record label's app; "make it dark, we work late" | Build every direction dark, without asking | Same bench (brief N2) |
| A page with no sign of dark | Light only, no question | Same bench (briefs S1, S2) |
