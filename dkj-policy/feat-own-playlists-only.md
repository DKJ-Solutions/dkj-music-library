## feat/own-playlists-only

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

Dave: nummers uit een gedeelde Spotify-playlist (zoals "trap" van l_v_l) horen niet in de
bibliotheek. Gekozen: alle gedeelde playlists (elke playlist die niet van het eigen account is), en
een nummer dat ook in een eigen playlist staat, blijft.

### CREATE

- [x] `ownPlaylists.ts`: de bibliotheek krijgt alleen de eigen playlists te zien, en `removeSharedOnlyTracks` haalt nummers, koppelingen en daarna artiesten zonder nummer weg die de snapshot alleen in gedeelde playlists kent
- [x] De sync-route en `library:assign-ids` gebruiken het (`ownerUserId` uit `private-rules.json`; zonder eigen account verandert er niets)
- [x] `library:assign-ids` gedraaid: 821 nummers en 392 artiesten weg, 11.639 nummers over; geen van de weggehaalde had eigen `notes`, `tags`, `genre`, `musical_key` of `bpm`
- [x] README bijgewerkt

### TEST

- [x] Tests voor `ownPlaylists.ts`: filteren, de overlap blijft, een nummer zonder playlist blijft, opnieuw draaien doet niets, zonder eigen account niets weg
- [x] Tweede run haalt niets meer weg; geen rij heeft nog een gedeelde playlist in `spotify_playlist`
- [x] typecheck, lint en alle 806 tests groen

### DEPLOY: feat/own-playlists-only

Alleen je eigen Spotify-playlists vullen de trackbibliotheek. Een gedeelde playlist, van een ander
account dat je volgt, staat nog wel op `/spotify`, maar levert geen nummers, artiesten of
`spotify_playlist`-regels meer. Een nummer dat ook in een eigen playlist staat, blijft. Wat alleen via
gedeelde playlists binnenkwam, is weggehaald: 821 nummers en 392 artiesten. Dat gebeurt bij elke sync
opnieuw.

**Score:** 3

#### What makes this deploy extra special

Het trackregister toont alleen nog Daves eigen collectie, zonder de ruim achthonderd nummers uit
playlists van anderen, zoals "trap" en "D&B".

**Score:** 3

#### Pull Request

Nummers uit gedeelde playlists horen niet in de bibliotheek
