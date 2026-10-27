## feat/product-hub-styling

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

The owner asked (October 27, 2026) for the product (localhost:3000) to follow the styling of the hub
(localhost:4893) more closely. The product already loads the house style; the gap is in its own domain
layer, which kept the pre-hub look: a serif page title up to 52px, its own page padding, soft drop
shadows, a 14px radius, and card links without an icon. Only the domain layer and the product's own
components change; the house files stay untouched.

### CREATE

- [x] `--font-display` follows the house sans, so page titles, tile labels and figures read like the hub
- [x] `.masthead h1` takes the house `h1` (sans, 32px, `--primary`) instead of its own serif size
- [x] `.lede` at `--text-base`, like the house `.lead`, instead of growing with the window
- [x] `.wrap` takes the padding of the hub's `.page-column`
- [x] `--shadow: none` and `--radius: var(--radius-lg)`: flat surfaces with a line, like the hub's cards
- [x] every card link carries a line icon (`.menu-item__icon`), as the hub's cards do
- [x] the site header reads `dkj-music-library product`, as the hub's reads `... hub`

### TEST

- [x] `tsc --noEmit`, eslint and the vitest suite (924 tests) pass
- [x] /spotify checked at 1400 wide: one grid of icon cards under a 32px sans title, fits without scrolling
- [ ] the owner's look at the product next to the hub

### DEPLOY: feat/product-hub-styling

The product now looks like the hub it sits under: page titles in the house sans at 32px instead of a
large serif, the hub's page margins, flat surfaces without drop shadows, an icon on every card link, and
`product` after the name in the site header.

**Score:**

#### What makes this deploy extra special

**Score:**

#### Pull Request

product styling follows the hub

