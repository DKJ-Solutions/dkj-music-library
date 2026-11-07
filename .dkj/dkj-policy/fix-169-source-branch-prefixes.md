## fix/169-source-branch-prefixes

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

Make this repo use the source's branch-prefix table (DKJ-Solutions/dkj-marketplace#3886): `feat/` ->
`feature`, `fix/` -> `bug`, `docs/` -> no label, `chore/` refused. This repo's table still allowed
`chore/` (label `documentation`).

#### Pending entry retype

| Entry | Old type | New type | Why |
|---|---|---|---|
| `config/120-dkj-marketplace` | Config (unknown prefix) | Feat (`feat/120-dkj-marketplace`) | tooling/config work: settings keys, imports and CI runners moved to the new marketplace name |

No other pending entry carries a type outside Feat/Fix/Docs; released history is left alone.

### CREATE

- [x] `scripts/lib/branch-info.ps1`: prefix table, `Get-BranchTypes`, `Get-BranchPrefix`, `Get-BranchInfo` and `Test-BranchName` copied from the source (chore/ row removed and refused, the shell character-set rule added); header says it follows the source table (#3886)
- [x] `.dkj/dkj-policy/CHANGELOG.md`: the pending `config/120-dkj-marketplace` entry retyped to `feat/120-dkj-marketplace`
- [x] `scripts/library/publish-library.ps1` and `README.md`: `npm run library:publish` creates `feat/library-<time>` instead of the now-refused `chore/library-<time>`, and commits as `feat:`
- [x] Label `feature` exists on the tracker (nothing to create)

### TEST

- [x] `branch-info.ps1` dot-sources cleanly and is pure ASCII; `Get-BranchTypes` returns Feat, Fix, Docs, Chore; feat/fix/docs map to feature/bug/no label; `chore/x` is refused; `config/x` is unknown but valid; `feat/a;b` is refused
- [~] No repo test suite touches branch-info (no `scripts/tests` here); the gates run in open-pr

### DEPLOY: fix/169-source-branch-prefixes

This repo now uses the same branch prefixes as every DKJ repo (DKJ-Solutions/dkj-marketplace#3886): `feat/` -> `feature`, `fix/` -> `bug`, `docs/` -> no label, and `chore/` is refused. `scripts/lib/branch-info.ps1` carries the source's functions, `npm run library:publish` now opens a `feat/library-<time>` branch, and the one pending entry under a retired type (`config/120`) is filed as `feat/`.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Use the source's branch prefixes
