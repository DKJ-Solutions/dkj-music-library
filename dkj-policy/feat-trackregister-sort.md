## feat/trackregister-sort

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
> For tier 2 audiences: the subscriber of a service. That reader and nobody else -- what matters only
> inside this repo belongs under the first `**Score:**`. If the change reaches that reader
> not at all, N/A is a complete answer and the common one. **One hop and no further:** where that
> reader is itself a business, ITS own customers sit one hop past this repo and are never the reader
> here -- they take nothing this repo ships. Name the party that runs the upgrade, and score
> against them.
>
> The phase arc, the marks and the whole form: `DEVELOPMENT-portable.md`, which ships
> with this workflow.

### PLAN

Dave vroeg om een sorteeroptie in de bovenste rij van het trackregister. Elke kolomkop wordt een knop:
eerste klik oplopend, tweede aflopend, derde terug naar de oorspronkelijke volgorde. Lege cellen staan in
beide richtingen onderaan; lijstkolommen (artiest-ID's, playlists, groepen) sorteren op hun waarden achter
elkaar. De sortering werkt op het gefilterde resultaat en springt terug naar pagina 1.

### CREATE

- [x] `sortRegister` + `SortKey`/`RegisterSort` in `src/lib/library/register.ts` (pure, numerieke collator)
- [x] Beschrijving (lede) onder de kop "DKJ Trackregister" weggehaald, op verzoek van Dave
- [x] `margin-bottom` uit `.masthead` (`_masthead.scss`) weggehaald, op verzoek van Dave -- geldt voor alle zes pagina's met die kop
- [x] Klikbare kopregel met `aria-sort` en ▲/▼/↕ in `TrackRegister.tsx`, stijl in `_track-register.scss`

### TEST

- [x] Unit-tests `sortRegister` (numeriek, leeg onderaan, lijstkolom, invoer onaangetast) en een componenttest voor de klikcyclus
- [x] vitest, typecheck en eslint groen
- [ ] Dave bekijkt de kopregel in de browser (zichtbaar resultaat, wacht op zijn woord)

### DEPLOY: feat/trackregister-sort

Het trackregister sorteert op elke kolom: klik op een kolomkop voor oplopend, nog eens voor aflopend, en
een derde keer voor de oorspronkelijke volgorde. Lege cellen blijven onderaan, BPM en ID's sorteren
numeriek (96BPM vóór 112BPM). De beschrijving onder de kop "DKJ Trackregister" is weg, en `.masthead` heeft geen `margin-bottom` meer (op alle pagina's met die kop).

**Score:** 3

#### What makes this deploy extra special

N/A -- een lokale app zonder abonnees; alleen Dave gebruikt het register.

**Score:** N/A

#### Pull Request

Trackregister sorteert op elke kolom via de kopregel

