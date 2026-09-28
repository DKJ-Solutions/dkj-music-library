## feat/dkj-genre-field

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

Dave vroeg om een kolom `dkj_genre` in het trackregister met de keuzes EDM, POP, ALT en OST. Eén
waarde per track (tekst met options, zoals `dkj_bpm`), zelf in te vullen; niet afgeleid.

### CREATE

- [x] `dkj_genre` in `fields.ts` (type text, options EDM/POP/ALT/OST)
- [x] `register.ts`: `genre` in de rij, in de zoektekst, het filter, `countBy` en de sortering
- [x] `TrackRegister.tsx`: kolom `dkj_genre` na `dkj_bpm`, plus een filter
- [x] Export bijgewerkt: elke track heeft nu `"dkj_genre":null` (verder niets gewijzigd, gecontroleerd)
- [x] README: het veld bij de velden met vaste keuzes

### TEST

- [x] Tests voor de opties, het filter en de kolom; typecheck, vitest (61 bestanden) en eslint groen
- [ ] Dave bekijkt de kolom op /spotify/trackregister

### DEPLOY: feat/dkj-genre-field

Het trackregister heeft een nieuwe kolom `dkj_genre` met de keuzes `EDM`, `POP`, `ALT` en `OST`, naast
`dkj_bpm`, met een eigen filter (inclusief "Leeg"). Het veld accepteert alleen die vier waarden bij een
import; het is nog bij alle tracks leeg en wordt niet afgeleid.

**Score:** 3

#### What makes this deploy extra special

Wie de bibliotheek gebruikt, kan tracks nu op genre indelen en in het register op genre filteren.

**Score:** 3

#### Pull Request

Trackregister krijgt dkj_genre (EDM, POP, ALT, OST)

