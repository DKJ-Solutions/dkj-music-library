## feat/planned-colour-cards

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

- [x] Acht card-links op /mixen/planned (Cyan, Yellow, Blue, Green, Orange, Magenta, Red, Purple) via `PageCardGrid`, zoals op de homepagina
- [x] `PageCardGrid` krijgt een optionele `dot`: een stip in de `--emotion-*`-kleur op de plek van het icoon (`components/_colour-cards.scss`; eerst een volle achtergrond, op verzoek teruggebracht naar de stijl van de andere cards)
- [x] Een landingspagina per kleur op /mixen/planned/<kleur>, met een lege melding; de kleuren staan op één plek (`lib/mixes/plannedColours.ts`)

### TEST

- [x] `tsc --noEmit`, eslint en vitest (926) groen; de acht links en hun pagina's geven 200, een onbekende kleur 404
- [x] Visuele check door de eigenaar

### DEPLOY: feat/planned-colour-cards

De pagina Planned onder Mixen toont acht kaarten, één per albumkleur (Cyan, Yellow, Blue, Green, Orange,
Magenta, Red, Purple), in dezelfde stijl als de andere kaarten, met een stip in de kleur zelf. Elke kaart
opent een eigen landingspagina voor de geplande mixen in die kleur, voorlopig nog leeg. Daarvoor stond er op
Planned alleen een lege melding.

**Score:** 2

#### What makes this deploy extra special

Wie de app gebruikt, ziet op Planned meteen de acht kleuren waar de geplande mixen onder komen te vallen.

**Score:** 2

#### Pull Request

Acht kleurkaarten op /mixen/planned

