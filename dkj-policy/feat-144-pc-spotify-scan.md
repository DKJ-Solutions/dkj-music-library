## feat/144-pc-spotify-scan

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

#### Keuzes voor de open vragen van #144

Alleen de exacte koppeling op `dkj_file` (hoofdletters, witruimte en Unicode-vorm tellen niet mee). Een vagere
koppeling (artiest + titel, ID3/ISRC, een handmatige link) en rekordbox' `collection.xml` als tweede bron staan in #151.

### CREATE

- [x] `src/lib/local/localMusicConfig.ts`: de map uit het git-ignored `data/local/local-music.json`, met `local-music.example.json` in de repo-root
- [x] `src/lib/local/scanMusicFolder.ts`: recursief, alleen audiobestanden, alleen lezen
- [x] `src/lib/local/compareLocal.ts`: te downloaden per playlist, alleen lokaal, gekoppeld, zonder bestandsnaam
- [x] `/compare/pc-spotify` toont de vier getallen en de twee lijsten; zonder map blijft de lege melding
- [x] README: de sectie over `data/local/local-music.json`

### TEST

- [x] Unit-tests voor de drie modules (14 tests), `tsc --noEmit` groen
- [~] Owner bekijkt /compare/pc-spotify met een gekoppelde map -- not done as a separate look: davekokbwj approved the branch through issues-sweep-reviews on November 7, 2026 without one.

### DEPLOY: feat/144-pc-spotify-scan

`/compare/pc-spotify` heeft een bron: zet in `data/local/local-music.json` het pad naar je muziekmap (zie
`local-music.example.json`), en de pagina toont per playlist wat in Spotify staat maar nog niet als bestand in die
map, plus de bestanden zonder track en het aantal gekoppelde tracks. De map wordt alleen gelezen. Een bestand
koppelt aan een track als zijn naam zonder extensie gelijk is aan `dkj_file`.

**Score:** 4

#### What makes this deploy extra special

De downloadlijst was het hele doel van de PC-kant: wat nog gedownload moet worden, staat nu op één pagina in plaats
van in je hoofd.

**Score:** 4

#### Pull Request

PC <-> Spotify: lokale muziekmap scannen en tonen wat nog gedownload moet worden

