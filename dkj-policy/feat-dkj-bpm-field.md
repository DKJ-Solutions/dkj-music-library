## feat/dkj-bpm-field

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

Drie nieuwe kolommen in het Trackregister (de trackdatabase, schema in `src/lib/library/fields.ts`),
op verzoek van Dave in één sessie: `dkj_bpm`, `dkj_album` en `dkj_artist`.

### CREATE

- [x] `FieldDef.options`: een `text`-veld met een vaste lijst keuzes; `toSqlValue` weigert al het andere, `validateFields` controleert de lijst
- [x] `dkj_bpm` met 128BPM, 112BPM, 176BPM, 144BPM, 96BPM
- [x] `dkj_album` met 32 opties: 8 kleuren × Light/Full × (f)/(m)
- [x] `dkj_artist`: de eerste artiest uit `artists`, bij nieuwe tracks direct, bij bestaande via `fillPrimaryArtists()` in elke sync
- [x] Export bijgewerkt: alle 12.471 tracks hebben hun `dkj_artist`, `dkj_bpm` en `dkj_album` staan leeg
- [x] README bijgewerkt

### TEST

- [x] typecheck, eslint en vitest groen (698 tests), met nieuwe tests voor options, de albumlijst en `dkj_artist`

### DEPLOY: feat/dkj-bpm-field

#### What does the change on this branch deploy to main?

##### Tier 0

Het Trackregister krijgt drie kolommen. `dkj_bpm` en `dkj_album` hebben een vaste lijst keuzes
(`FieldDef.options`, nieuw): `dkj_bpm` kent 128BPM, 112BPM, 176BPM, 144BPM en 96BPM, `dkj_album` de 32
combinaties van acht kleuren (Green, Yellow, Red, Purple, Cyan, Blue, Orange, Magenta) met Light/Full en
(f)/(m), bijvoorbeeld `Green Light (f)`. Een andere waarde breekt de import af; hoofdletters en spaties
tellen niet mee. `dkj_artist` bevat precies één artiest: de eerste uit `artists`. Nieuwe tracks krijgen hem
bij het aanmaken, bestaande bij elke sync zolang het veld leeg is; alle 12.471 tracks in de export zijn
meteen gevuld.

**Score:** 3

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

Trackregister krijgt de kolommen dkj_bpm, dkj_album en dkj_artist

