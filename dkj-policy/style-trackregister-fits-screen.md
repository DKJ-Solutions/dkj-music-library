## style/trackregister-fits-screen

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

Dave (27 september 2026): de tabel mag niet hoger worden dan het scherm, Vorige en Volgende moeten altijd
zichtbaar zijn, en `.masthead` krijgt `padding-bottom: 12px` in plaats van 28px. Zichtbaar resultaat:
de PR wacht op Dave's oordeel.

### CREATE

- [x] `.register-table-box`: `max-height` is het venster min de pager (`100dvh`, met `100vh` als terugval), zonder de oude minimale 420px
- [x] `.register-pager`: plakt aan de onderkant van het venster, met de paginakleur erachter
- [x] `.masthead`: `padding-bottom` 28px -> 12px
- [x] Dave (27 september 2026): er waren twee verticale scrollbalken, want de `max-height` rekende de masthead en de filters erboven niet mee, dus de pagina scrolde ook. Nu is `.wrap--full` precies zo hoog als het venster (flexkolom), vult `.register-table-box` de rest (`flex: 1`, min. 240px) en staat de pager er gewoon onder: één verticale scrollbalk

### TEST

- [x] SCSS compileert; `TrackRegister.test.tsx` groen
- [~] Zelf in de browser bekeken -- de browserextensie was niet verbonden; Dave beoordeelt het vóór de merge

### DEPLOY: style/trackregister-fits-screen

De tabel in het Trackregister wordt nooit hoger dan het venster: de pagina is zo hoog als het scherm en
het scrollvak van de tabel vult wat er overblijft, dus er is nog maar één verticale scrollbalk. Vorige en
Volgende staan daaronder altijd in beeld, dus je hoeft niet meer naar beneden te scrollen om te bladeren. De kop van elke
pagina met een masthead heeft onderaan minder ruimte: 12px in plaats van 28px.

**Score:** 2

#### What makes this deploy extra special

Wie door het register bladert, ziet de knoppen Vorige en Volgende altijd, zonder eerst naar beneden te
scrollen.

**Score:** 3

#### Pull Request

Trackregister past in het scherm, bladerknoppen altijd zichtbaar

