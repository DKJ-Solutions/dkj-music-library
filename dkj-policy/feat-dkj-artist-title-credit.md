## feat/dkj-artist-title-credit

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
> The phase arc, the marks and the whole form: `DEVELOPMENT-portable.md`, which ships
> with this workflow.

### PLAN

Vervolg op #16. Daar ging alleen een remixer voor die Spotify ook bij de track zet; bij 223 tracks noemt
de titel een naam die er niet bij staat. Dave koos (27 september 2026): de naam uit de titel gaat altijd
voor, ook als dat soms een stijl is ("Techno Mix" -> Techno), omdat een echte remixer missen erger is.

### CREATE

- [x] `titleCreditOf()` in `primaryArtist.ts`: de naam vóór het versiewoord, zonder versiewoorden (`Radio`, `Original`, `Extended`, `UK`, `Re-`), jaartallen en plaatformaten, en zonder een `feat.`-stuk ervoor
- [x] Stap 1 (artiest van de track) kijkt nu in álle versiedelen, de laatste eerst, zodat `Taking You Back (Afrojack Edit) - Radio Edit` → AFROJACK
- [x] Bestaande data omgezet waar `dkj_artist` nog de hoofdartiest was: 209 tracks. De 14 andere van de 223 hebben alleen een jaartal of formaat en houden de hoofdartiest
- [x] README bijgewerkt

### TEST

- [x] typecheck, eslint en vitest groen, met tests voor de naam uit de titel en de uitzonderingen
- [x] Alle 223 kandidaten nagelopen; parserfouten (`Uk`, `98`, `1985 7`, `feat. Starling -`, `Re-`) gevonden en gerepareerd vóór het omzetten

### DEPLOY: feat/dkj-artist-title-credit

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_artist` neemt nu ook een remixer die alleen in de titel staat: `The Wolves - Lenzman Remix` →
Lenzman, `Good Times - Martin Sharp Remix` → Martin Sharp. Een stijl leest daarbij als naam (`Techno
Mix` → Techno), zoals gekozen; jaartallen, plaatformaten en woorden als `Radio` of `Original` tellen niet.
Bij 209 bestaande tracks is `dkj_artist` daarmee veranderd.

**Score:** 2

<!--
     Is this change also relevant to management and the employer/commissioner? Then continue to Tier 1.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

<!--
     Is this change also relevant to a subscriber of the service? Then continue to Tier 2.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

dkj_artist: ook een remixer die alleen in de titel staat gaat voor

