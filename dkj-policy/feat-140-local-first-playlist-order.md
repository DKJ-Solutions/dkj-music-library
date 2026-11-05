## feat/140-local-first-playlist-order

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

Issue #140. The owner chose local-first ordering because it means fewer Spotify API calls and faster dragging (conversation, November 5, 2026). The condition was that a conflict must not throw the sorting work away, so the push rebases instead.

### CREATE

- [x] POST /api/spotify/playlist-order only queues locally, with no Spotify call
- [x] Push button always on a werkbak page, disabled with "Niets te pushen" at 0 moves
- [x] Rebase (`rebaseOrder`) in the push and after a Fetch/full sync, so the local order survives tracks being added or removed in Spotify
- [x] Fetch no longer asks for a destructive confirmation (`pendingMoves` prop removed)

### TEST

- [x] vitest suites for lib, api/spotify, components/spotify and mixen (1043 tests) green; `tsc --noEmit` and `eslint src` clean
- [x] Both werkbak pages render (200) with the Push button
- [x] The owner looks at the werkbak pages (Dave: "gezien en akkoord", November 5, 2026)

### DEPLOY: feat/140-local-first-playlist-order

Dragging a track on a werkbak page (`/mixen/preparation/<id>`) now only saves the new order in the hub. A Push button on every werkbak sends all moves to Spotify in one go. One push replaces the checks, writes and refetches each single drag used to cost, so the hub hits Spotify's rate limit far less, and dragging no longer waits on Spotify. If tracks were added to or removed from the playlist in Spotify in the meantime, the push and Fetch rebase the local order onto it: new tracks go to the bottom and vanished ones drop out. The local order is no longer thrown away.

**Score:** 3

#### What makes this deploy extra special

Dave sorts his werkbakken without running into rate limits, and he decides himself when Spotify follows.

**Score:** 4

#### Pull Request

Save werkbak drag moves locally first and push them to Spotify in bulk

