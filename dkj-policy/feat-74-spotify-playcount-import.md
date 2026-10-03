## feat/74-spotify-playcount-import

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

Issue #74. Beslissingen: een play telt vanaf 30 seconden (Spotify's eigen grens), de zip gaat naar
`data/spotify/streaming-history/`, en `spotify_playcount` komt gewoon in de publieke export (Dave,
3 oktober 2026). De history zelf is nog niet binnen, dus de import is gebouwd en getest op fixtures
en nog niet op echte data gedraaid. Op Daves verzoek meegenomen: de year-kolom krijgt een vaste
breedte, zodat het jaar altijd zichtbaar is.

### CREATE

- [x] `src/lib/library/playcounts.ts`: plays tellen per Spotify-ID, optellen over alle Spotify-varianten van een nummer (koppeltabel), 0 voor een track zonder plays, alleen veranderde aantallen schrijven
- [x] `scripts/library/import-playcounts.ts` en `npm run library:playcounts` (met `--dir` en `--min-seconds`)
- [x] year-kolom in het trackregister: vaste breedte van 64px in plaats van 5%
- [x] Visuele review door Dave

### TEST

- [x] `playcounts.test.ts`: drempel, URI's, optellen over varianten, onbekende tracks, 0, herhaalde run
- [x] vitest (919 groen), tsc, eslint
- [x] Foutpad van het script zonder history-map

### DEPLOY: feat/74-spotify-playcount-import

Nieuw: `npm run library:playcounts` leest de Extended streaming history van Spotify
(`Streaming_History_Audio_*.json`, uitgepakt in `data/spotify/streaming-history/`) en vult
`spotify_playcount` bij elke track. Een play telt vanaf 30 seconden, en de plays van alle
Spotify-varianten van een nummer (single, album, compilatie) tellen op bij de ene track. Een track
zonder plays krijgt 0; elke run telt opnieuw en overschrijft de vorige aantallen.

**Score:** 3

#### What makes this deploy extra special

De kolom playcount in het trackregister raakt gevuld zodra de history is geïmporteerd, en de
year-kolom heeft nu een vaste breedte, zodat het jaar ook op een smalle tabel altijd heel te zien is.

**Score:** 3

#### Pull Request

spotify_playcount vullen uit de Extended streaming history, en de year-kolom altijd zichtbaar

