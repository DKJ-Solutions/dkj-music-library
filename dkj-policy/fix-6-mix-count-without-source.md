## fix/6-mix-count-without-source

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
> For tier 2 audiences: the subscriber of a service. That reader and nobody else -- what matters only
> inside this repo belongs under the first `**Score:**`. If the change reaches that reader
> not at all, N/A is a complete answer and the common one. **One hop and no further:** where that
> reader is itself a business, ITS own customers sit one hop past this repo and are never the reader
> here -- they take nothing this repo ships. Name the party that runs the upgrade, and score
> against them.
>
> The phase arc, the marks and the whole form: `DEVELOPMENT-portable.md`, which ships
> with this workflow.

### PLAN

Issue #6: on a machine without the mix source, the **in DJ Cylow** tile on `/spotify` read `0`, while
the **met ID** tile hides itself in the same case. Verified: `buildPlaylistMixIndex` counts `0` over no
links, and the fallbacks in `page.tsx` and `WorldPage.tsx` pass `0` too; `PlaylistManager` shows the
tile for everything except `null`.

The fix goes where the number is made: an index with no mix links reports `mixesWithId: null`, so the
tile's existing `!== null` rule hides it. The README already names `MIXES_DATA_DIR` (the issue's second
proposal). No new candidate path is added: `djcylow-react` is not on this machine, so where it lives now
cannot be checked here. The `mixStore.ts` comment that said both repos sit under `DaveKJohn/` is
corrected instead.

#### Stops for a look

The change alters what `/spotify` shows, so this branch is parked without a PR until Dave has looked.

### CREATE

- [x] `PlaylistMixIndex.mixesWithId` is `number | null`; `null` when no mix came in
- [x] the fallbacks in `src/app/spotify/page.tsx` and `WorldPage.tsx` pass `null`
- [x] `mixStore.ts`: the sibling-repo comment says when the fallback works, and when `MIXES_DATA_DIR` is needed

### TEST

- [x] `playlistMixInfo.test.ts`: an empty link list gives `null`, not `0`
- [x] the existing `PlaylistManager` test already covers "no tile when `mixesWithId` is null"
- [x] gates run with `open-pr -GatesOnly` before parking

### DEPLOY: fix/6-mix-count-without-source

On `/spotify`, the **in DJ Cylow** tile no longer shows `0` when the mix source cannot be found. It
hides itself, the same as the **met ID** tile. Resolves #6.

**Score:** 2

#### What makes this deploy extra special

A subscriber of a service never sees this page; it runs locally for Dave alone.

**Score:** N/A

#### Pull Request

De 'in DJ Cylow'-teller verbergt zich als de mix-bron ontbreekt

