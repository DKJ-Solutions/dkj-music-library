## feat/feestzaal-cyan-full

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

### CREATE

- [x] `albumFromPlaylists.ts`: een playlist met `Feestzaal` als los woord in de naam (`isFeestzaalPlaylist`) maakt het album `Cyan Full (f)` (`FEESTZAAL_ALBUM`), vóór de regel dat alle album-playlists hetzelfde moeten noemen. Dave koos "wint van leeg": `fillMissing` vult alleen lege velden, dus een album dat er al staat blijft staan
- [x] De regel toegepast op de bibliotheek met alleen `fillAlbumsFromPlaylists` via `withLibrary` (niet de hele `library:assign-ids`, die ook uit de snapshot bijwerkt): 442 tracks gevuld, export bijgewerkt. README volgt

### TEST

- [x] Nieuwe tests in `albumFromPlaylists.test.ts` (regel, voorrang, los woord); hele suite (905 tests), `tsc --noEmit` en `eslint` groen
- [x] De export-diff nagelopen tegen `HEAD`: 11.639 tracks voor en na; alleen `dkj_album` en `updated_at` veranderd, bij 442 tracks, alle 442 van leeg naar `Cyan Full (f)`, alle 442 in een Feestzaal-playlist

### DEPLOY: feat/feestzaal-cyan-full

Tracks in een playlist met `Feestzaal` in de naam krijgen bij elke sync `dkj_album` Cyan Full (f), zolang
hun album nog leeg is -- ook als hun andere playlists verschillende albums noemen. Een album dat er al
staat, blijft staan. Meteen toegepast: 442 tracks hebben nu Cyan Full (f).

**Score:** 3

#### What makes this deploy extra special

Een afleidingsregel in de eigen bibliotheek; niemand buiten de repo merkt het.

**Score:** N/A

#### Pull Request

Tracks uit een Feestzaal-playlist krijgen dkj_album Cyan Full (f)

