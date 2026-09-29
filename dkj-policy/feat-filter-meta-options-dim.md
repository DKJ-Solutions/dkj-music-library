## feat/filter-meta-options-dim

> **How this file is read.** A step is `- [ ]` until it is resolved -- `- [x]` done, or
> `- [~]` dropped with the reason, which exists so nobody ticks a box for work they did not do.
> open-pr and ship-pr both refuse while one is still open, and there is no `-Force`.
>
> **FOUR `###` HEADINGS, AND NEVER A FIFTH** -- PLAN, CREATE, TEST, DEPLOY are the whole top
> level. A section needing its own heading goes in as a `####` UNDER whichever of the four owns
> it. No gate in YOUR repo reads a heading, so this half is on you -- only the repo that authors
> this workflow refuses a fifth (Dave, August 26, 2026).
>
> **AND NOTHING BRANCH-SPECIFIC ABOVE THE FIRST OF THOSE FOUR HEADINGS** -- everything between the
> title and it is this guidance, which is identical in every branch document. A status line, a note about
> THIS branch or an instruction to a session belongs under one of the four, normally as a `####`
> in PLAN. THIS half open-pr refuses, in every repo, before the push -- it reads the shape, so a
> guidance block in your own language passes and your own paragraph here does not (Dave,
> August 26, 2026; refused since #1650).
>
> **DEPLOY takes no steps of its own, and it is WRITTEN LAST** -- it is what the branch DID, once
> TEST says so. Written while steps above it are still open it states an INTENTION, and no gate
> holds it against what landed: the step gate splits this file at that heading and counts only
> above it. The PR title is the one exception -- new-branch -Title writes it at creation, because
> open-pr composes the PR title from it. It is the one part of this file that travels verbatim
> into `CHANGELOG.md` at the merge. In each tier, write the reason
> ABOVE the Score line -- anything below it is discarded.
>
> Relative links in that text resolve FROM THIS DIRECTORY -- `CHANGELOG.md` sits here too, so
> write each path exactly as it reads in this file.
>
> For tier 2 audiences: the user who relies on what this repo ships, and decides whether to take the next version -- a subscriber of a service, or the user of a tool, its own maintainer included. That reader and nobody else -- what matters only
> inside this repo belongs under the first `**Score:**`. If the change reaches that reader
> not at all, N/A is a complete answer and the common one. **One hop and no further:** where that
> reader is itself a business, ITS own customers sit one hop past this repo and are never the reader
> here -- they take nothing this repo ships. Name the party that runs the upgrade, and score
> against them.
>
> The phase arc, the marks and the whole form: `DEVELOPMENT-portable.md`, which ships
> with this workflow.

### PLAN

### CREATE

- [x] `TrackRegister.tsx`: de opties "Alle" en "Leeg" van de vier filter-dropdowns (dkj_bpm, dkj_genre, dkj_album, dkj_group) krijgen de klasse `register-option-meta`
- [x] `_track-register.scss`: die klasse krijgt `--muted`, de gewone opties expliciet `--ink`
- [x] `register.ts`: `albumMatches` -- een kleur uit `DKJ_ALBUM_COLOURS` als albumfilter past bij elk album van die kleur; een kleur is zelf nooit een album, dus geen botsing met de bestaande waarden
- [x] `TrackRegister.tsx`: elke kleurgroep in de dkj_album-dropdown begint met de kleur zelf, met het totaal van de vier varianten; de kleuren tellen mee als geldige bewaarde filterwaarde. README volgt

### TEST

- [x] Nieuwe tests in `register.test.ts` (kleurfilter) en `TrackRegister.test.tsx` (optie, telling, filter en herstel na een nieuw bezoek); hele suite (901 tests), `tsc --noEmit`, `eslint` op de gewijzigde bestanden en een Sass-compile groen
- [ ] Dave kijkt naar de uitgeklapte dropdowns en het kleurfilter op `/spotify/trackregister`

### DEPLOY: feat/filter-meta-options-dim

In de filters van het trackregister staan "Alle" en "Leeg" nu in een gedempte kleur, zodat de waarden
die je echt kiest eruit springen. Het `dkj_album`-filter kent nu ook alleen een kleur: kies Green en je
ziet Green Light en Green Full, (f) en (m) samen.

**Score:** 1

#### What makes this deploy extra special

Alleen een kleur en een extra filterkeuze in een eigen overzicht; niemand buiten de repo merkt het.

**Score:** N/A

#### Pull Request

Alle en Leeg minder fel, en het albumfilter kent ook alleen een kleur

