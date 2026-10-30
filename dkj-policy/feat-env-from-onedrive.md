## feat/env-from-onedrive

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

Dave asked for the Spotify secrets to live in OneDrive so a fresh clone does not need them looked up again.

### CREATE

- [x] `src/lib/env/onedriveEnv.ts`: copy `%OneDrive%\dkj-solutions\dkj-music-library\.env.local` into the repo when the repo has no filled-in `.env.local`
- [x] `scripts/env/copy-env-from-onedrive.ts` wired as `predev` (so the dev-preview hook runs it too) and as `env:onedrive`
- [x] Missing-credentials message, `.env.local.example` and README point at the OneDrive copy

### TEST

- [x] Unit tests for copy, keep, overwrite-placeholder, unfilled source and missing source
- [x] `npm test` (946 passed) and `tsc --noEmit` green

### DEPLOY: feat/env-from-onedrive

A fresh clone no longer needs the Spotify client ID and secret looked up again: `npm run dev` first copies `.env.local` from `%OneDrive%\dkj-solutions\dkj-music-library\` when the repo has no filled-in one of its own. A filled-in `.env.local` already in the repo is never overwritten, and the path comes from Windows' own `OneDrive` variable, so no user name lands in this public repo.

**Score:** 3

#### What makes this deploy extra special

The owner sets up a new checkout without hunting for the Spotify secret: store it once in OneDrive and every clone picks it up.

**Score:** 3

#### Pull Request

Spotify-sleutels uit OneDrive overnemen bij een verse clone

