## feat/dkj-genre-from-playlists

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

Dave (28 september 2026): vul `dkj_genre` op basis van de Spotify-playlisttitels. Dat keert het
"wordt niet afgeleid" uit #52 om; handmatig invullen blijft mogelijk, want er wordt alleen gevuld zolang
het veld leeg is.

### CREATE

- [x] `genreFromPlaylists.ts`: genre per playlistnaam, meeste stemmen per track, gelijke stand leeg
- [x] Gekoppeld in `applyLibraryIdsFromSnapshot` (sync en `library:assign-ids`), README bijgewerkt
- [x] `npm run library:assign-ids`: 10.503 tracks gevuld, export bijgewerkt

### TEST

- [x] `genreFromPlaylists.test.ts`; `npm test` (862), typecheck en lint groen

### DEPLOY: feat/dkj-genre-from-playlists

`dkj_genre` wordt nu bij elke sync (en bij `npm run library:assign-ids`) uit de playlistnamen afgeleid
zolang het leeg is, net als `dkj_bpm`: het genre als los woord in de naam (`128BPM EDM`, `Classic Pop`,
`ALT`, `OST`), en House Mix, Drum & Bass en D&B/DNB tellen als EDM. Het meest genoemde genre wint; bij
een gelijke stand blijft het leeg. De export is meteen gevuld: 10.503 van de 11.639 tracks (EDM 6.922,
POP 2.452, ALT 1.090, OST 39); 126 gelijke standen en 1.010 tracks zonder genre in hun playlists
blijven leeg.

**Score:** 3

#### What makes this deploy extra special

Het genrefilter in het trackregister werkt nu meteen voor bijna de hele bibliotheek, in plaats van dat
elk nummer met de hand een genre moet krijgen.

**Score:** 3

#### Pull Request

dkj_genre wordt uit de playlistnamen afgeleid

