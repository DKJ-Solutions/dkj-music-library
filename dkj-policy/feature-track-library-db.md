## feature/track-library-db

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
> The phase arc, the marks and the whole form: `DEVELOPMENT-portable.md`, which ships
> with this workflow.

### PLAN

Een lokale SQLite-database voor ~6000 tracks (eigen ID + Spotify-metadata), met alle velden in één schema-bestand zodat een nieuw veld één regel is.

### CREATE

- [x] Veldregister `src/lib/library/fields.ts`: alle velden op één plek, met validatie
- [x] `src/lib/library/db.ts`: SQLite via `node:sqlite`, schema-sync (toevoegen/hernoemen, nooit verwijderen)
- [x] `src/lib/library/trackStore.ts`: upsert per veld, typeconversie, lezen/tellen/verwijderen
- [x] CSV/JSON-import (`csv.ts`, `importFile.ts`, `scripts/library/import-tracks.ts`, `npm run library:import`)
- [x] Dependencies: `tsx` (script draaien), `@types/node` naar ^22.13 (types voor `node:sqlite`)
- [x] README: sectie "De trackdatabase"

### TEST

- [x] `npm test`: 639 tests groen, waarvan 22 nieuw (schema-sync, rollback bij een foute rij, 6000 tracks in één keer)
- [x] `npm run typecheck` en `npm run lint` groen
- [x] Script met de hand gedraaid tegen een tijdelijke database: een foute rij wordt geweigerd, opnieuw importeren werkt bij zonder dubbelen, de artiestenlijst komt als JSON in de database

### DEPLOY: feature/track-library-db

#### What does the change on this branch deploy to main?

##### Tier 0

The app now has a local track database. The collection of about 6000 tracks (your own track ID plus the
Spotify metadata) goes into one SQLite file with `npm run library:import`, from a CSV or JSON file. A
new data field is one line in `src/lib/library/fields.ts`, and the database adds the column itself.
Removing a field never deletes data.

**Score:** 4

<!--
     Is this change also relevant to management and the employer/commissioner? Then continue to Tier 1.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 1

Not relevant: the app is local and has no subscribers.

**Score:** N/A

<!--
     Is this change also relevant to a subscriber of the service? Then continue to Tier 2.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 2

Not relevant: see Tier 1.

**Score:** N/A

#### Pull Request

Trackdatabase voor de muziekcollectie

