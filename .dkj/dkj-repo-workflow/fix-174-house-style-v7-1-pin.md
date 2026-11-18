## fix/174-house-style-v7-1-pin

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

The house-style gate has been red since #173 moved the repo to dkj-marketplace v7 without taking the
v7.0.0 brand book copies, and `--fg-3` was retired upstream (#4046). It blocks every PR, #175 included
(issue #174). Take the v7.1.0 copies (the release the session runs) and move the gate's caller with them,
in one change, as the dkj-brandbook skill requires.

### CREATE

- [x] Vendor `house-style.css`, `house-product.css` and `house-theme.js` at v7.1.0, each sha256-checked against the skill's pin table
- [x] Vendor `InterVariable.woff2` and `LICENSE-Inter.txt` beside `house-style.css` (its `@font-face` loads the font relative to itself); mark the font `binary` in `.gitattributes`
- [x] Rename `var(--fg-3)` to `var(--fg-1)` in `_mirror.scss` and `_track-register.scss` (one text colour since #4046)
- [x] Point `.github/workflows/house-style.yml` at `@v7.1.0` and `scripts-ref: v7.1.0`

### TEST

- [x] `check-house-style.ps1` against the v7.1.0 skill page: `[OK] the brand book holds at v7.1.0`
- [x] `npm run build` passes, so the font URL resolves

### DEPLOY: fix/174-house-style-v7-1-pin

The app now renders with the v7.1.0 brand book, including the house font Inter, and the house-style check on
pull requests is green again. The mirror and the track register's secondary text takes the one house text colour.

**Score:** 2

#### What makes this deploy extra special

For the owner using the app: the pages pick up the brand book's current look and font.

**Score:** 2

#### Pull Request

Take the v7.1.0 brand book and drop the retired --fg-3

