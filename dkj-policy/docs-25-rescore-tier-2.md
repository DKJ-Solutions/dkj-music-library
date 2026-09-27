## docs/25-rescore-tier-2

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

Issue #25: every entry under `[Unreleased]` answered tier 2 with N/A, written before this repo settled
that the app's user is its tier-2 reader (`Get-ReleaseAudienceTier = 2`; the definition is in
DKJ-Solutions/dkj-claude-plugins#2557: a tool its user relies on is tier 2, even when that user is its
maintainer). By now there are 25 entries, not 19. Measured with the plugin's own
`Resolve-EntryImpact` / `Format-ChangelogPendingSummary`: all 25 read as tier 0, and the tally said
`0 / 25 patch entries`.

The rule used per entry: does the user of the app see it in their collection, on the register, on
`/spotify` or in their track data? If so, tier 2 is scored on the 1-5 scale from that user's view.
Workflow and developer tooling stay N/A. Tier 0 and tier 1 are left as written.

### CREATE

- [x] 21 entries rescored for tier 2, reason above the score, in the entries' own language
- [x] Four stay N/A: fix/1-stale-spotify-write-comment, feat/release-audience-tier,
      chore/commit-settings-statusline, chore/adopt-dkj-workflow
- [x] Tally line recomputed with `Set-ChangelogPendingSummary`: `21 / 25 minor entries`

### TEST

- [x] `Resolve-EntryImpact` reads the 21 as tier 2 and the four as tier 0; only the tier-2 reason and
      score lines changed (43 lines, 21 × 2 plus the tally)

### DEPLOY: docs/25-rescore-tier-2

The 21 changelog entries whose work the app's user can see are now scored for tier 2. The four that are
workflow or developer tooling stay N/A. The pending tally now reads `21 / 25 minor entries`, so the next
release earns a minor instead of a patch. Resolves #25.

**Score:** 2

#### What makes this deploy extra special

N/A. This changes how past entries are scored; the app itself does not change for its user.

**Score:** N/A

#### Pull Request

Changelog-entries opnieuw beoordeeld op tier 2 (de gebruiker van de app)

