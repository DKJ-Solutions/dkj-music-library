## feat/library-export-onedrive

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
> Relative links in that text resolve FROM `.dkj/dkj-policy/`, where `CHANGELOG.md` sits --
> not from this directory.
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

The library export (`data/library/export/`) leaves git and moves to OneDrive, next to the saved `.env.local`: `%OneDrive%\dkj-solutions\dkj-music-library\library-export\`. Every rating made in the trackregister then reaches the other machine through OneDrive, with no commit and no PR, and the ratings, notes and playlist names are no longer public (Dave, November 18, 2026). `LIBRARY_EXPORT_DIR` still overrides; without OneDrive (CI) the export falls back to the git-ignored `data/library/export/`. `npm run library:publish` existed only to put the export on `main`, so it goes, with `export-diff` and `exportDiff.ts`.

### CREATE

- [x] `getLibraryExportDir` resolves `LIBRARY_EXPORT_DIR`, then `%OneDrive%\dkj-solutions\dkj-music-library\library-export`, then `data/library/export/`; `getOneDriveRoot` is shared with the `.env.local` copy.
- [x] `vitest.setup.ts` points `LIBRARY_EXPORT_DIR` at a temp folder, so a test on a machine with OneDrive never writes the real library.
- [x] `data/library/export/` removed from git and ignored; its `.gitattributes` line removed.
- [x] `library:publish`, `scripts/library/publish-library.ps1`, `scripts/library/export-diff.ts` and `src/lib/library/exportDiff.ts` (+ test, + house-style allowlist entry) removed.
- [x] Script messages and code comments no longer say "commit data/library/export/".
- [x] README: the data table, "Op elke machine dezelfde bibliotheek", the migration steps, and the `library:publish` section removed.

### TEST

- [x] Unit tests added for `getLibraryExportDir` (override, OneDrive, fallback) and `getOneDriveRoot`.
- [~] Local `npm run lint`, `typecheck` and `test`: dropped -- the session that built this branch could not install packages (no network for npm); the `ci` workflow runs all three on the PR.
- [~] The migration on a real machine: dropped from this branch -- it needs the owner's machines and OneDrive; the steps are in the README under "De overstap van git naar OneDrive".

### DEPLOY: feat/library-export-onedrive

The track library now travels between machines through OneDrive instead of git. A rating, a local-file link or a sync is written to `%OneDrive%\dkj-solutions\dkj-music-library\library-export\` and reaches the other machine by itself: no commit, no PR, and the library is no longer public. `npm run library:publish` is gone. After pulling, run `npm run library:sync` once per machine, starting with the machine where the library last changed (README, "De overstap van git naar OneDrive"). The old export stays in the git history.

**Score:** 3

#### What makes this deploy extra special

For the owner using the app: changing a rating no longer costs a PR, and the ratings, notes and playlist names stop being public.

**Score:** 2

#### Pull Request

Move the library export from git to OneDrive
