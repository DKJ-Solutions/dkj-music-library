## feat/preparation-position-column

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

- [x] Een kolom `#` in de tabel van elke werkbak op /mixen/preparation/<id>: de plek van de rij, 1 tot en met n (Dave, 29 oktober 2026)

### CREATE

- [x] `POSITION_COLUMN` in TrackRegister.tsx, alleen in de compacte tabel; volgt de getoonde volgorde, sorteert zelf niet
- [x] Stijl in `_track-register.scss`: rechts uitgelijnd, even brede cijfers
- [x] Een lijn in de accentkleur onder rij 36 (`MIX_SIZE`), het gebruikelijke aantal nummers van een mix (Dave, 29 oktober 2026)
- [x] Afspeelknop omgekeerd: vlak in de themakleur (`--accent-ink`), icoon in `--paper-1`, naar `.btn--primary` (Dave, 29 oktober 2026)

### TEST

- [x] Twee tests in TrackRegister.test.tsx: nummering 1..n ook na sorteren, en geen plek-kolom in de gewone tabel (31/31 groen)
- [x] `tsc --noEmit` en eslint schoon; werkbak-pagina op localhost geeft 67 rijen genummerd 1..67
- [x] Visuele check door Dave ("ja ship it", 29 oktober 2026)

### DEPLOY: feat/preparation-position-column

De tabel op elke werkbak-pagina onder /mixen/preparation heeft een eerste kolom `#` met de plek van elke track: 1 tot en met het aantal tracks, in de volgorde waarin de tabel ze toont. Na het sorteren op een kop staat 1 weer bovenaan. Onder rij 36 staat een lijn in de accentkleur: zoveel nummers heeft een mix meestal, dus daar heeft de werkbak genoeg voor de volgende stap. De afspeelknop in de tabel (ook op /spotify/trackregister) is omgekeerd: een gevulde cirkel in de themakleur met een neutraal icoon, zodat hij beter opvalt.

**Score:** 2

#### What makes this deploy extra special

Dave ziet in één oogopslag op welke plek een track in de werkbak staat, en of er al genoeg nummers voor een mix zijn.

**Score:** 2

#### Pull Request

Plek-kolom in de tabel van elke werkbak

