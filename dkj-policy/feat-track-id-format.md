## feat/track-id-format

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

#### Keuze van de eigenaar (27 september 2026)

De eigenaar vroeg om `dkj_track_id` = `<dkj_artist_id><XX>`. Van de 4.333 hoofdartiesten had er één meer
dan 99 nummers (Immediate, 143). Omdat een doorgroeiend volgnummer achter een doorgroeiend artiest-ID niet
eenduidig te splitsen is, koos de eigenaar voor een scheidingsteken: `PRO02-01`. Standaarden die de
eigenaar zijn voorgelegd: de hoofdartiest is de eerste die Spotify noemt, en de oude ID's worden één keer
omgenummerd in de volgorde van hun T-nummer.

### CREATE

- [x] `trackIds.ts`: `formatTrackId(artistId, n)`, per-artiest laagste vrije volgnummer, `XXX00` zonder artiest-ID, `dkj_artist_ids` direct bij het aanmaken, `renumberLegacyTrackIds()`
- [x] `artistIds.ts`: `applyLibraryIdsFromSnapshot()` = artiesten, dan omnummeren, dan nummers; `readArtistIdMap()`
- [x] `fields.ts`: `ARTIST_IDS_KEY` (gedeeld door trackIds en artistIds zonder importcirkel)
- [x] Sync-endpoint en `library:assign-ids` via `applyLibraryIdsFromSnapshot()`
- [x] README: formaat en de eenmalige omnummering
- [x] Echte bibliotheek: 12.471 tracks omgenummerd

### TEST

- [x] Tests herschreven voor het nieuwe formaat, plus: doorgroeien na 99, `XXX00`, omnummeren (volgorde, bestaande nieuwe ID's, koppelingen, tweede keer niets), eenmalig omnummeren via de orchestrator
- [x] Vitest 693/693, `tsc --noEmit` en `eslint` schoon
- [x] Echte data: 0 ID's in het oude of een verkeerd formaat, 0 koppelingen naar een onbekend ID, alle 12.471 ID's beginnen met hun hoofdartiest; verse database uit de export opgebouwd

### DEPLOY: feat/track-id-format

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_track_id` bestaat nu uit het artiest-ID van de hoofdartiest, een streepje en een volgnummer per
artiest: Firestarter van The Prodigy is `PRO02-21`, Rehab van Amy Winehouse `AMY01-01`. Het volgnummer
heeft minstens twee cijfers en groeit na 99 door (`IMM01-143`). De bestaande `T000001`-ID's zijn één keer
omgenummerd, per artiest in hun oude volgorde, en in de koppeltabel mee aangepast. Een nieuw nummer krijgt
bij het aanmaken meteen ook zijn `dkj_artist_ids`.

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

dkj_track_id becomes <dkj_artist_id>-<NN>, numbered per main artist (PRO02-01)

