## feat/clean-dkj-title

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

- [x] Keuze van Dave: generieke versie-aanduidingen en featuring gaan eruit, remixen van artiesten blijven staan

### CREATE

- [x] `titleNameOf` in `fileName.ts`: een groep tussen haakjes valt weg als elk woord een versiewoord of jaartal is, of als het een featuring is
- [x] `refreshTitles` in `artistIds.ts`: zet bestaande `dkj_title` recht waar hij nog de oude afgeleide vorm heeft; draait mee in elke sync
- [x] Export bijgewerkt: 1668 titels schoongemaakt, verder niets veranderd

### TEST

- [x] Tests voor `titleNameOf` en `refreshTitles`; vitest, tsc en eslint zijn groen, en een steekproef van 30 gewijzigde titels is nagelopen

### DEPLOY: feat/clean-dkj-title

`dkj_title` is nu alleen de titel. Generieke versie-aanduidingen en featuring gaan eruit:
*99 Biker Friends (Main Version) (Explicit)* wordt *99 Biker Friends*, *2 up in the Morning (Radio Mix)* wordt
*2 up in the Morning* en *Titanium (feat. Sia)* wordt *Titanium*. Een remix van een artiest blijft staan
(*Higher (David Penn Remix)*), net als wat bij de titel hoort (*(I Can't Get No) Satisfaction*). Een groep
tussen haakjes is generiek als elk woord erin een versiewoord of een jaartal is (`fileName.ts`).
Bestaande waarden in de oude afgeleide vorm zijn rechtgezet (1668 tracks) door `refreshTitles`, die ook in
elke sync meedraait. Een zelf ingevulde titel blijft staan.

**Score:** 3

#### What makes this deploy extra special

In het trackregister staat voortaan de kale titel, zonder Radio Mix, Remastered of featuring.

**Score:** 3

#### Pull Request

dkj_title zonder versie-aanduiding en featuring

