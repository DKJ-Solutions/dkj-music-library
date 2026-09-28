## feat/register-filter-box

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

De filters van TrackRegister (year, dkj_bpm, dkj_genre, dkj_album, dkj_group en "Filters wissen") in een eigen omkaderd vak zetten, los van zoeken, de kolomschakelaar en de teller.

### CREATE

- [x] `TrackRegister.tsx`: de filters in een `<fieldset className="register-filters">` met `<legend>Filters</legend>`; zoeken, kolomschakelaar en teller blijven in `.register-controls` erboven
- [x] `_track-register.scss`: `.register-filters` met dezelfde rand, radius en vlak als het tabelvak, kopje in de rand

### TEST

- [x] `npx tsc --noEmit` schoon, `npx eslint` schoon, `npx vitest run src/components/spotify` 101/101 groen
- [ ] Dave bekijkt het trackregister in de browser (het filtervak en hoe het afbreekt op een smal venster)

### DEPLOY: feat/register-filter-box

De filters van het trackregister staan in een eigen `<fieldset>` met kader, los van zoeken, de kolomschakelaar en de teller.

**Score:** 1

#### What makes this deploy extra special

Het trackregister toont de filters in een eigen omkaderd vak met het kopje "Filters", zodat ze in één oogopslag bij elkaar staan.

**Score:** 2

#### Pull Request

Trackregister krijgt een omkaderde filtersectie

