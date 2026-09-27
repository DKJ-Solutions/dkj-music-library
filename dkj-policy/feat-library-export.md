## feat/library-export

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

Export tracks + spotify_track_ids to a sorted text file under data/library (committed, repo is public by the owner's choice); openLibraryDb seeds a missing library.db from it.

#### Keuze van de eigenaar

Export in deze publieke repo (gekozen op 27 september 2026, na de expliciete waarschuwing dat collectie,
tags en notities dan openbaar zijn). De eerdere regel "de collectie komt nooit in git" in `.gitignore`,
`db.ts` en de README is daarmee vervangen. Op het moment van committen zijn alle eigen velden (bpm, genre,
tags, notes, musical_key, release_year) nog leeg; openbaar zijn dus alleen de ID's en de Spotify-metadata.

### CREATE

- [x] `src/lib/library/libraryFile.ts`: export/restore naar `data/library/export/*.ndjson`, hash in `library_meta`, `openLibrary()`/`withLibrary()`
- [x] Sync-endpoint, `library:import` en `library:assign-ids` via `withLibrary()`; nieuw `library:sync`
- [x] `.gitignore` laat alleen `data/library/export/` door; `.gitattributes` zet de export op LF
- [x] README en de kopcommentaar van `db.ts` bijgewerkt
- [x] Eerste export van de echte bibliotheek (12.471 nummers, 13.140 Spotify-ID's)

### TEST

- [x] `libraryFile.test.ts`: round-trip, determinisme, vervangen i.p.v. aanvullen, CRLF, verse kloon, export na pull, eerste export, leeg, export na elke schrijfstap
- [x] Vitest 659/659, `tsc --noEmit` en `eslint` schoon
- [x] Review Victor: half mislukte export kon gecommit werk wissen -> `pending`-markering (DB nieuwer dan export wordt nooit overschreven); `busy_timeout` voor gelijktijdige schrijvers; restore weigert rijen zonder verplicht veld. Tests toegevoegd (661/661)
- [x] Review Sebastian: niets gevonden; `.gitignore` houdt tokens, private-rules, snapshot en `.db` buiten git (met `git check-ignore` nagelopen)
- [x] Echte data: verse database via `LIBRARY_DB_PATH` uit de export opgebouwd; beide tabellen identiek aan het origineel

### DEPLOY: feat/library-export

#### What does the change on this branch deploy to main?

##### Tier 0

De trackbibliotheek reist nu met de repo mee. `data/library/export/` bevat elk nummer met zijn eigen ID en
alle velden als gesorteerde NDJSON, en elke kloon bouwt zijn lokale `library.db` daar vanzelf uit op. Elke
schrijvende stap (de sync op `/spotify`, `library:import`, `library:assign-ids`) werkt de export
direct bij. Een `git pull` met een nieuwere export wordt bij de volgende opening overgenomen. Met
`npm run library:sync` trek je database en export met de hand gelijk.

**Score:** 4

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

Track library travels with the repo as a text export and rebuilds itself on a fresh clone

