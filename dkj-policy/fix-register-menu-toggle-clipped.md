## fix/register-menu-toggle-clipped

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

De menuknop ("4 playlists ▾") schuift met `margin-left: -7px` naar links om zijn tekst onder de kolomkop te zetten. Daardoor wordt de wrapper `.register-menu` (inline-block) 7px smaller dan de knop, en kapt `max-width: 100%` het ▾ en de rechterrand af (gemeten: scrollWidth 72 tegen clientWidth 65).

### CREATE

- [x] `margin-right: 7px` op de knop in een cel, zodat de wrapper zijn volle breedte krijgt
- [ ] Visuele check door Dave (trackregister en tracklist van een gepubliceerde mix)

### TEST

- [x] Gemeten in de browser: elke menuknop scrollWidth = clientWidth (72/72), tekst nog steeds op 0px van de kolomkop

### DEPLOY: fix/register-menu-toggle-clipped

De menuknoppen in het trackregister ("4 playlists ▾", "2 groups ▾" enz.) vielen 7px te smal uit, waardoor het ▾ en de rechterrand werden afgekapt. Ze hebben nu hun volle breedte, en de tekst staat nog steeds recht onder de kolomkop.

**Score:** 1

#### What makes this deploy extra special

Wie het trackregister gebruikt ziet de menuknoppen weer heel, met pijltje en rand.

**Score:** 2

#### Pull Request

Menuknop in het trackregister niet meer afgekapt

