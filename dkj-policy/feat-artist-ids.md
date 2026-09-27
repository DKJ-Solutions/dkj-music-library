## feat/artist-ids

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

artists table keyed by Spotify artist id; artist_id = first 3 letters of the name (leading article dropped, accents folded, X-padded) + lowest free 2-digit number, growing past 99; tracks get artist_ids (list); artists.ndjson joins the export.

#### Keuzes van de eigenaar (27 september 2026)

Zijn oorspronkelijke vraag was 2 letters + 2 cijfers. Gemeten op 6.951 artiesten zaten 11 lettercombinaties
boven de 99 (MA = 266). De eigenaar koos daarna 3 letters + 2 cijfers, met lidwoorden altijd genegeerd;
dan komt geen combinatie boven de 99 (MAR = 87). Het vangnet voorbij 99 (MAR100) en de overige
standaarden (eigen tabel, `artist_ids` als lijst, accenten eraf, aanvullen met X, één ID per
Spotify-artiest) zijn hem genoemd en niet afgewezen.

### CREATE

- [x] `src/lib/library/artistIds.ts`: `artistPrefix`, `planArtistIds` (laagste vrije nummer, groeit voorbij 99), `applyArtistIdsFromSnapshot` (tabel `artists`, vult `artist_ids` alleen als die leeg is)
- [x] `fields.ts`: veld `artist_ids` (json)
- [x] `libraryFile.ts`: `artists.ndjson` in de export; een export zonder dat bestand zet nog steeds terug
- [x] Sync-endpoint en `library:assign-ids` kennen na de track-ID's ook de artiest-ID's toe
- [x] README: sectie "Eigen artiest-ID's"
- [x] Echte bibliotheek: 6.951 artiesten, alle ID's vijf tekens lang, alle 12.471 tracks hebben `artist_ids`

### TEST

- [x] `artistIds.test.ts`: 17 naamgevallen, volgorde + laagste vrije nummer, MAR100, zelfde naam andere artiest, opnieuw draaien doet niets, eigen waarde blijft staan, export/restore met en zonder `artists.ndjson`
- [x] Vitest 686/686, `tsc --noEmit` en `eslint` schoon

### DEPLOY: feat/artist-ids

#### What does the change on this branch deploy to main?

##### Tier 0

Elke Spotify-artiest krijgt een eigen ID van drie letters plus een nummer (The Prodigy wordt `PRO02`,
Amy Winehouse `AMY01`). De letters zijn de eerste drie van de naam, zonder lidwoord en zonder accenten;
het nummer is het laagste dat nog vrij is en groeit voorbij 99 door als dat nodig is. De ID's staan in de
nieuwe tabel `artists` en in de export als `artists.ndjson`. Elke track heeft nu `artist_ids`, met de
hoofdartiest eerst. Dat gebeurt na elke sync op `/spotify` en met `npm run library:assign-ids`.

**Score:** 3

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

Every Spotify artist gets its own ID: three letters of the name plus a number (PRO01)

