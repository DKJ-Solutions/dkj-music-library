## feat/151-pc-spotify-fuzzy-link

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

Owner's decision on #151 (November 7, 2026): a fuzzy artist + title match that suggests a link, plus a manual link stored as a `dkj_*` field to confirm or correct it. rekordbox's `collection.xml` does not join as a source.

### CREATE

- [x] New field `dkj_local_file` (`fields.ts`, `RegisterRow.localFile`): the hand-made link, as the path from the music folder
- [x] `compareLocal`: own link first (while that file exists), then `dkj_file`, then a one-to-one suggestion for what is left: Dice on the normalised artist + title words (`ft.`/`featuring` fold to `feat`, accents and punctuation dropped), from 0.7, found through a word index. A suggested pair leaves both lists until it is confirmed
- [x] `POST /api/local/link` (`localLink.ts`, `saveLocalLink.ts`): sets or clears `dkj_local_file` of an existing track, like the rating route
- [x] `/compare/pc-spotify`: a third card *Voorstellen* (`PcSpotifyLinks.tsx`) to confirm or correct each suggestion, link any track by hand, and undo an own link; a tile with the count
- [x] README: the lokale-muziekmap section names the suggestions and `dkj_local_file`

### TEST

- [x] `vitest` on `src/lib` and `src/components` (1071 passed, new cases for links, suggestions, threshold and one-to-one), `tsc --noEmit` and `eslint` clean; `check-house-style` adds no finding (the 127 on main are #148's). The full gate runs in `ship-pr` after the owner's look
- [~] The owner opens `/compare/pc-spotify` against the music folder, judges the suggestions and links one by hand -- not done as a separate look: davekokbwj approved the branch through issues-sweep-reviews on 2026-11-07 without one.

### DEPLOY: feat/151-pc-spotify-fuzzy-link

`/compare/pc-spotify` now suggests a local file for a track whose file name is spelt differently (`ft.` for `feat.`, a renamed file), so it no longer shows up both as *to download* and as *local only*. You confirm or correct the suggestion with one click, or link any track to a file by hand; the link is stored in `dkj_local_file` and travels with the library export.

**Score:** 3

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

PC <-> Spotify: suggest a fuzzy match and link a file by hand

