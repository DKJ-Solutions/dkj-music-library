## fix/migrate-dkj-marketplace-v7

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
> Relative links in that text resolve FROM `.dkj/dkj-repo-workflow/`, where `CHANGELOG.md` sits --
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

Move this repo to the v7.0.0 plugin names (dkj-repo-workflow, -dkj, -bwj), enable dkj-subagents-developers, move .dkj/dkj-policy/ to .dkj/dkj-repo-workflow/, re-adopt the CI floor and statusline, and repoint the developer-persona lenses.

### CREATE

- [x] Moved the plugin ids in `.claude/settings.json` to the v7.0.0 names (`dkj-repo-workflow`, `dkj-repo-workflow-dkj`, `dkj-repo-workflow-bwj`), enabled `dkj-subagents-developers`, and rewrote the `*dkj-policy*` allow patterns to `*dkj-repo-workflow*`; installed the new ids at project scope and updated `dkj-subagents-alpha` to 7.0.0.
- [x] Ran Part 1 of `adopt-dkj-repo-workflow` with `-Apply`, using the DKJ-Solutions/dkj-marketplace#4251 workaround: `.dkj/dkj-policy/` moved to `.dkj/dkj-repo-workflow/`, and `scripts/repo-config.ps1` and the `CLAUDE.md` imports repointed.
- [x] Re-scaffolded the CI floor (`fold-on-merge`, `verify-resolved`, `repo-settings`, `merge-on-green`, plus the new `close-parked-recurrences`) with `adopt-ci-floor -Apply`, pinned at v7.0.0; diffed against the old runners and nothing repo-specific was lost (the merge-on-green trigger list keeps every gate and now names House style too).
- [x] Pinned the gate callers `branch-entry`, `always-on-budget` and `house-style` from `@main` to `@v7.0.0` with `scripts-ref: v7.0.0`, and replaced their "@main IS DELIBERATE" comments.
- [x] Replaced the statusline shim, which matched `dkj-policy@*` and went dark after the rename (DKJ-Solutions/dkj-marketplace#4252).
- [x] Repointed the Derek and Rendall lenses at `dkj-subagents-developers/personas/` and re-adopted `Get-MojibakePaths` from the blueprint, so the mojibake check covers the moved folder (DKJ-Solutions/dkj-marketplace#4253).
- [x] `scripts/library/publish-library.ps1` (`npm run library:publish`) looked up the `dkj-policy` install, which no longer exists after the rename, and wrote the branch document under the retired root `dkj-policy/`: it now resolves `dkj-repo-workflow@dkj-marketplace` and writes under `.dkj/dkj-repo-workflow/`. Verified that the lookup resolves the 7.0.0 scripts.
- [x] Swept the tree for `dkj-policy`, `dkj-solutions@` and `bwj-development@`: current-state prose in the lenses, the PR template and the README now names `dkj-repo-workflow`; history prose in comments and the release notes stays as written, as does `always-on-baseline.json` (not a gap per DKJ-Solutions/dkj-marketplace#4253).

### TEST

- [x] `publish-library.ps1`'s plugin lookup run in isolation returns the dkj-repo-workflow 7.0.0 scripts folder.
- [x] `Get-MojibakePaths` returns the files under `.dkj/dkj-repo-workflow/`.
- [x] Every persona pointer in `.claude/specialists/` resolves except the baseline key named above.

### DEPLOY: fix/migrate-dkj-marketplace-v7

This repo now runs on dkj-marketplace v7.0.0: the workflow plugin under its new name, the developers team enabled, the workflow folder at `.dkj/dkj-repo-workflow/`, and the CI runners and gate callers pinned at v7.0.0. `npm run library:publish` finds the renamed plugin again.

**Score:** 3

#### What makes this deploy extra special

N/A -- the app itself does not change; only the workflow it is built with.

**Score:** N/A

#### Pull Request

Migrate to dkj-marketplace v7.0.0

