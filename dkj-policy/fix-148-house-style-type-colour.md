## fix/148-house-style-type-colour

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

`check-house-style` at v6.9.0 reported 116 `type` and 11 `colour` findings in `src/styles/**` (#148). Map each onto the house scale, a house weight or a domain token, so the check holds without an allowlist.

### CREATE

- [x] Sizes rounded to the nearest house step: 19px to `--text-h2`, 15px to `--text-h3`, 13/13.5px to `--text-base`, 12/12.5px to `--text-sm`, 11/11.5px to `--text-xs`. Below the house scale, two domain steps in `_root.scss`: `--text-micro` (10px, for 9.5/10/10.5px) and `--text-glyph` (7px, the sort arrow)
- [x] Weights: 600 and 700 to `--font-weight-bold`, 400 and 500 to `--font-weight-regular` (the house has no semibold)
- [x] The relative `code` sizes (0.92em, 0.88em) removed, since the house sets `code` once in `:where(code)`; `th code` reads `inherit` instead of `1em`
- [x] Every `color-mix()` in a colour property moved into a domain token in `_root.scss` (`--accent-edge`, `--accent-edge-line`, `--accent-edge-strong`, `--accent-line-mix`, `--accent-wash`, `--accent-wash-strong`, `--surface-row`, and `--emotion-<colour>-tint` / `-edge` per emotion colour)

### TEST

- [x] `check-house-style` at v6.9.0: `[OK] the brand book holds`, 0 findings; `main.scss` compiles with sass. The full gate runs in `ship-pr` after the owner's look
- [~] The owner judges the pages with dense tables (track register, playlist manager, mix bridge, dashboard): the 600 to 700 weights and the half-pixel sizes rounded to the scale shift slightly -- not done as a separate look: davekokbwj approved the branch through issues-sweep-reviews on 2026-11-07 without one.

### DEPLOY: fix/148-house-style-type-colour

The app's own styling now reads every font size, weight and derived colour from the house brand book or a named domain token, so the `house-style` check is green again. Text that was set in-between sizes (12.5px, 13.5px, semibold) now sits on the house scale, so some labels are a touch larger or bolder.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Map the repo layer's sizes, weights and derived colours onto house tokens

