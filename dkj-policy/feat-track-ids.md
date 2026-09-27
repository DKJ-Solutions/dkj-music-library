## feat/track-ids

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

- [x] Beslist met de eigenaar: ID-vorm is een oplopend nummer (`T000001`), en tracks worden samengevoegd op titel + exact dezelfde artiesten

### CREATE

- [x] `src/lib/library/trackIds.ts`: pure `planTrackIds` plus `applyTrackIdsFromSnapshot`, en de koppeltabel `spotify_track_ids`
- [x] `npm run library:assign-ids` (`scripts/library/assign-track-ids.ts`)
- [x] Na elke sync automatisch (`src/app/api/spotify/sync/route.ts`); als dat mislukt, faalt de sync niet
- [x] README: sectie "Eigen track-ID's uit Spotify"

### TEST

- [x] Unit-tests: formaat, sleutel, samenvoegen, stabiliteit over runs, eigen velden blijven staan
- [x] Volledige suite (650 tests), typecheck en lint groen
- [x] Met de hand gedraaid op de echte snapshot: 13.140 Spotify-ID's worden 12.471 nummers; een tweede run doet niets
- [x] De sync-route compileert in Next met `node:sqlite` (GET geeft 405 en geen bundelfout)

### DEPLOY: feat/track-ids

#### What does the change on this branch deploy to main?

##### Tier 0

Elk nummer uit de Spotify-snapshot krijgt een eigen, oplopend ID (`T000001`) in de trackdatabase.
Releasevarianten met dezelfde titel en precies dezelfde artiesten krijgen hetzelfde ID. De nieuwe
koppeltabel `spotify_track_ids` houdt de ID's stabiel over syncs heen: een nieuwe variant van een bekend
nummer krijgt het bestaande ID, en alleen een echt nieuw nummer krijgt het volgende vrije nummer. Een
nieuw nummer wordt aangemaakt met titel, artiesten, album en duur van Spotify. Bestaande rijen worden
daarna nooit meer overschreven. Dit gebeurt na elke sync op `/spotify`, en los via
`npm run library:assign-ids`. Op de huidige snapshot levert dat 12.471 nummers op, uit 13.140
Spotify-ID's.

**Score:** 3

<!--
     Is this change also relevant to management and the employer/commissioner? Then continue to Tier 1.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 1

Een lokale, persoonlijke tool: er is geen management of opdrachtgever die hier iets aan heeft.

**Score:** N/A

<!--
     Is this change also relevant to a subscriber of the service? Then continue to Tier 2.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 2

De app heeft geen abonnees: hij draait alleen op de eigen machine.

**Score:** N/A

#### Pull Request

Give every Spotify track its own ID (T000001), one per song

