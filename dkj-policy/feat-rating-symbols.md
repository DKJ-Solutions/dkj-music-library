## feat/rating-symbols

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

Dave wil de vier symbolen uit zijn screenshot (groene cirkel, blauwe driehoek, paarse ruit, oranje
vijfhoek) als teken voor dkj_rating, één symbool per paar tiers.

### CREATE

- [x] `RatingSymbol` in `TrackRegister.tsx`: tier-1/2 cirkel, tier-3/4 driehoek, tier-5/6 ruit, tier-7/8 vijfhoek
- [x] Vormen in `_track-register.scss` via `clip-path`, kleur exact uit Daves screenshot als `--rating-*`-tokens in `_root.scss`
- [x] Symbool in de cel én in het keuzemenu van het potloodje
- [x] Waarden hernoemd van `star-N` naar `tier-N` (Dave: je ziet geen ster): `fields.ts`, de export
  (1× tier-3, 11.638× tier-4) en `fillDefaultRatings` zet een oude `star-N` in de database om

### TEST

- [x] Test in `TrackRegister.test.tsx`: de juiste vorm per paar tiers; suite en typecheck groen
- [ ] Dave bekijkt het trackregister in de browser

### DEPLOY: feat/rating-symbols

Interne weergave: het trackregister toont bij elke waardering een gekleurd symbool, en de waarden van
`dkj_rating` heten `tier-1` tot `tier-8` in plaats van `star-1` tot `star-8`. De sync zet een oude
`star-N` in de database om naar `tier-N` met hetzelfde getal.

**Score:** 3

#### What makes this deploy extra special

De eigen waardering is in één oogopslag te lezen: tier-1/2 een groene cirkel, tier-3/4 een blauwe
driehoek, tier-5/6 een paarse ruit en tier-7/8 een oranje vijfhoek, in de tabel en in het keuzemenu. De waarden heten nu `tier-1` tot `tier-8` (was `star-1` tot `star-8`),
want je ziet geen ster; je eigen keuzes blijven staan met hetzelfde getal.

**Score:** 3

#### Pull Request

De eigen waardering heet tier en krijgt een gekleurd symbool per paar

