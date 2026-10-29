## feat/playlist-sync-button

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

Een sync-knop op elke pagina met een tracktabel die bij één Spotify-playlist hoort: de werkbakken op
`/mixen/preparation/<id>` en de mixen op `/mixen/published/<slug>` (als de mix een eigen playlist heeft).
Eén playlist opnieuw ophalen, niet de volledige sync.

### CREATE

- [x] `syncOnePlaylist` in `src/lib/spotify/ingest.ts`: metadata + alle tracks van één playlist, op zijn plek in de snapshot
- [x] `src/lib/library/librarySync.ts`: de library-stap uit de volledige sync gehaald en gedeeld
- [x] Route `POST /api/spotify/sync/playlist`
- [x] `PlaylistSyncButton` + stijl, op de preparation- en de published-pagina
- [x] Primary-knop met sync-icoon (draait tijdens de sync)
- [x] `.wrap--full`: ruimte via `gap: var(--spacing-6)` in plaats van marges op kop, kaart en tabel

### TEST

- [x] Unit-tests voor `syncOnePlaylist`; volledige suite (936), typecheck en lint groen
- [x] Route live aangeroepen op `5p4okOZaBczCnGduUhfFQd`: 68 tracks, bibliotheek bijgewerkt; knop rendert op beide pagina's
- [x] Visuele check door Dave ("ship it", 29 oktober 2026)

### DEPLOY: feat/playlist-sync-button

Een eigen route en een gedeelde library-stap voor de sync van één playlist; de volledige sync gebruikt
dezelfde library-stap. `.wrap--full` zet de ruimte tussen zijn blokken nu met een gap in plaats van marges.

**Score:** 2

#### What makes this deploy extra special

Boven de tracktabel van een werkbak of mix staat een knop "Sync met Spotify": één klik haalt die playlist
opnieuw op en de tabel loopt weer gelijk, zonder de volledige sync van alle playlists af te wachten. Op alle
pagina's met een volle-breedte-tabel staat er nu wat meer ruimte tussen de kop en de tabel.

**Score:** 3

#### Pull Request

Sync-knop op tracktabellen van een Spotify-playlist

