## fix/1-stale-spotify-write-comment

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

Issue #1: the header of the mix-tag route still called itself the only route that writes to Spotify,
while playlist-name calls itself the second. Verified against the code: `updatePlaylistDescription` and
`updatePlaylistName` are the two writers, each called by exactly one route. A search for the same claim
elsewhere found it in `src/lib/spotify/config.ts` too (the scope explanation). `playlistApi.ts` ("the
only place that writes back") and `httpClient.ts` ("`spotifyPut` is the only write path") still hold and
stay as they are.

### CREATE

- [x] mix-tag route header: one of the two routes that write to Spotify, beside playlist-name
- [x] config.ts scope note: the hub uses description and name, via the two functions in playlistApi.ts

### TEST

- [x] Comment-only change; no behaviour to test. The gates run in ship-pr.

### DEPLOY: fix/1-stale-spotify-write-comment

The comments in the mix-tag route and in the Spotify scope configuration no longer claim that the
playlist description is the only thing the hub writes to Spotify; they name both writers, the
description (mix-tag) and the name (playlist-name). Resolves #1.

Prevents a later reader from trusting the stale claim when judging what the Spotify scopes are used for.

**Score:** 1

#### What makes this deploy extra special

A subscriber of a service never sees a source comment.

**Score:** N/A

#### Pull Request

Verouderd commentaar: mix-tag heet nog de enige Spotify-schrijfroute

