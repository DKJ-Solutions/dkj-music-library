## refactor/dkj-track-id

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

#### Keuze van de eigenaar

Na `dkj_artist_id` (PR #9) vroeg de eigenaar om ook `track_id` te hernoemen naar `dkj_track_id` (27 september
2026), zodat duidelijk is dat het een eigen veld is.

### CREATE

- [x] `TRACK_ID_KEY` = `dkj_track_id` overal; `LEGACY_TRACK_ID_KEY` = `track_id` voor de overgang
- [x] `renameLegacyColumn()` in `db.ts`: `tracks` (syncSchema) en `spotify_track_ids` (ensureSpotifyLinkTable) hernoemen de kolom zelf
- [x] `restoreLibrary()` leest een oude export met `track_id`; `upsertTracks()` accepteert de oude kolomkop in een import
- [x] Echte bibliotheek gemigreerd en opnieuw geëxporteerd; in de export komt `track_id` niet meer voor

### TEST

- [x] Nieuwe tests: oude database migreert met data, oude export zet terug, import met `track_id`-kop werkt
- [x] Vitest 689/689, `tsc --noEmit` en `eslint` schoon
- [x] Echte data: aantallen gelijk (12.471 / 13.140 / 6.951), verse database via `LIBRARY_DB_PATH` uit de nieuwe export opgebouwd

### DEPLOY: refactor/dkj-track-id

#### What does the change on this branch deploy to main?

##### Tier 0

`track_id` heet nu `dkj_track_id`: in de database, in de export en als kolomkop voor
`npm run library:import`. Er is niets te doen: een bestaande database hernoemt de kolom de eerste keer dat
hij opent, een oude export wordt nog gewoon gelezen, en een importbestand met `track_id` als kolomkop werkt
nog.

**Score:** 2

<!--
     Is this change also relevant to management and the employer/commissioner? Then continue to Tier 1.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 1

Een persoonlijke tool zonder opdrachtgever; niemand buiten de ontwikkelaar merkt dit.

**Score:** N/A

<!--
     Is this change also relevant to a subscriber of the service? Then continue to Tier 2.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 2

Er is geen dienst met abonnees.

**Score:** N/A

#### Pull Request

track_id becomes dkj_track_id, with a migration for existing databases, exports and import files

