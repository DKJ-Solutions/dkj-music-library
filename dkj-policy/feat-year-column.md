## feat/year-column

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

Dave: een nieuwe kolom `year` met het jaar waarin het nummer uitkwam, en die kolom ook in de tabel van
het trackregister. Het lege veld `release_year` bestond al: dat wordt `year` (via `renamedFrom`), zodat
er geen twee jaarkolommen komen.

### CREATE

- [x] Ingest vraagt `release_date` op (live gecontroleerd: Spotify geeft hem nog terug) en haalt een ongewijzigde playlist uit een oudere snapshot één keer opnieuw op
- [x] `release_year` hernoemd naar `year`; `releaseYears.ts` vult het vroegste jaar over alle varianten, alleen zolang het leeg is
- [x] `readTrackIdOf` in `trackIds.ts` vervangt twee kopieën van dezelfde query (`playlistLinks.ts`, `djcylowMixes.ts`)
- [x] Kolom `year` in het trackregister, na `dkj_albumartiest` (sorteren en zoeken werken ook)
- [x] Sync gedraaid en `library:assign-ids`: alle 12.460 nummers hebben een jaar (1947 t/m 2026)
- [x] README bijgewerkt

### TEST

- [x] Tests voor `yearOf`, `planReleaseYears`, `applyReleaseYears`, het opnieuw ophalen in de ingest en sorteren en zoeken in het register
- [x] typecheck, lint en alle 799 tests groen

### DEPLOY: feat/year-column

Elk nummer heeft een veld `year`: het jaar waarin het uitkwam, volgens Spotify. Het trackregister
toont het in een eigen kolom, na de artiest, en je kunt erop sorteren en zoeken. Staat een nummer op
meer albums (single, album, compilatie), dan telt het vroegste jaar. Het lege veld `release_year` heet
nu `year`. De sync haalt de albumdatum mee, en bij de eerste sync na deze wijziging worden alle
playlists één keer volledig opgehaald.

**Score:** 3

#### What makes this deploy extra special

Dave ziet in het register meteen uit welk jaar elk nummer is, en kan de collectie op jaar sorteren.

**Score:** 3

#### Pull Request

Kolom year met het jaar van uitgave uit Spotify

