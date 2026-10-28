## feat/mix-square-thumbnail

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

### CREATE

- [x] `image_square` uit de mix-JSON genormaliseerd naar `Mix.imageSquare`, plus `mixSquareFile` die het pad onder `public/` van djcylow-react oplost (en niets buiten `public/` toelaat)
- [x] Route `/api/mixes/square/[slug]` die de thumbnail van die mix serveert -- de slug wordt opgezocht, er komt geen pad uit de URL op schijf
- [x] `PageCardGrid` kreeg `image`: een 40px thumbnail op de plek van het icoon; /mixen/published zet hem waar het bestand bestaat, anders blijft het disc-icoon

### TEST

- [x] `tsc`, `eslint` en de mix-suites groen; nieuwe tests voor `imageSquare` en `mixSquareFile` (incl. paden buiten `public/`)
- [x] Route geprobeerd: 200 `image/webp` voor een echte slug, 404 voor een traversal-poging
- [ ] Visuele check door Dave: de thumbnails op /mixen/published zien er goed uit (formaat 40px, afgeronde hoeken)

### DEPLOY: feat/mix-square-thumbnail

De cards op /mixen/published tonen nu de vierkante thumbnail van de mix in plaats van het disc-icoon. De afbeelding komt uit `public/` van djcylow-react via een nieuwe route `/api/mixes/square/<slug>`; een mix zonder `image_square` (26 van de 86) houdt het disc-icoon.

**Score:** 2

#### What makes this deploy extra special

De mixenlijst is in één oogopslag te herkennen aan de covers, zoals op djcylow.com zelf.

**Score:** 3

#### Pull Request

Square thumbnail van de mix op de cards van /mixen/published

