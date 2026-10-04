## chore/spotify-playcounts-import

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

- [x] De Spotify-export (`my_spotify_data.zip`) uit de root naar `data/spotify/` verplaatst (buiten git) en uitgepakt in `data/spotify/streaming-history/`
- [x] `npm run library:playcounts` gedraaid: 25 bestanden, 248.313 regels, 124.451 plays van 30 s of langer

### TEST

- [x] Telling sluit: 54.291 plays bij tracks in de bibliotheek + 70.160 bij tracks die er niet in staan = 124.451
- [x] De diff raakt alleen `spotify_playcount` (de kolom kwam er in #76 bij); 7.337 tracks hebben plays, 4.302 staan op 0

### DEPLOY: chore/spotify-playcounts-import

`spotify_playcount` is voor het eerst gevuld, uit de Extended streaming history die Spotify op
3 oktober 2026 leverde (2012 tot en met 2026). 7.337 van de 11.639 tracks hebben plays, samen 54.291;
de rest staat op 0. Koploper: Sigma feat. Shakka - Lost Away (Hybrid Minds Remix), 130 keer.

**Score:** 2

#### What makes this deploy extra special

De playcount-kolom in het trackregister toont nu echte aantallen in plaats van leeg, dus je kunt
zien en sorteren wat je het vaakst hebt gedraaid.

**Score:** 3

#### Pull Request

spotify_playcount gevuld uit de eerste echte Extended streaming history

