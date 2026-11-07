## feat/145-desktop-mirror

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

#### Issue #145

Keep a reserve drive identical to the working drive (music + rekordbox library), one way only, with a dry run first that shows copies and deletions, and refusals when rekordbox runs, a drive is missing or the reserve is newer. The README already named the Desktop mirror as still to be built, and the home page reserved a card for it.

Design: robocopy /MIR, because Windows ships it and it copies only what differs. The real run carries the digest of the approved dry run and runs a fresh dry run first; it refuses when the two differ, so it never does anything other than what was approved.

### CREATE

- [x] `src/lib/mirror/robocopyPlan.ts`: robocopy arguments, log parser (verified against the `/UNILOG` output of a real `/L` run), plan digest, path checks
- [x] `src/lib/mirror/mirrorRunner.ts` + `mirrorConfig.ts`: refusals, dry run, guarded real run, last successful mirror in `data/mirror/state.json`; paths in `data/mirror/config.json` (git-ignored), example in `mirror-config.example.json`
- [x] `/api/mirror/dry-run`, `/api/mirror/run`, `/api/mirror/status`
- [x] Page `/mirror` (`MirrorPanel`), a card on Home, README line, domain styles in house tokens
- [x] Tests: parser, digest, path checks, every refusal, the approved-plan guard, success and failure of a run

### TEST

- [x] Affected suites, `tsc --noEmit`, `eslint` and `check-house-style` (no finding in the new files) clean; `main.scss` compiles with sass. The full gate runs in `ship-pr` after the owner's look
- [ ] The owner sets the two drive paths in `data/mirror/config.json`, runs a dry run on `/mirror` and judges the page

### DEPLOY: feat/145-desktop-mirror

The Desktop mirror is built: `/mirror` (with its own card on Home) mirrors the working drive with the music and the rekordbox library one way to a reserve drive, with robocopy. A dry run first lists what will be copied and what will be deleted on the reserve, and only then does a button mirror exactly that plan: the server runs a fresh dry run first and refuses if anything changed. It also refuses while rekordbox runs, when a drive is missing, when the two paths overlap, and when a file on the reserve is newer than on the working drive. The page shows the time of the last successful mirror. The two paths go in `data/mirror/config.json` (see `mirror-config.example.json`).

**Score:** 4

#### What makes this deploy extra special

A dead working drive now costs at most the changes since the last mirror, and the mirror can never quietly throw away work done on the reserve.

**Score:** 4

#### Pull Request

Desktop mirror: one-way mirror of the working music drive to a reserve drive

