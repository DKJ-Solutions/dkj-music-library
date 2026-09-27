## feat/dkj-file-field

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

Dave wil een kolom `dkj_file`: de bestandsnaam zoals op zijn desktop. Zijn voorbeelden: `Abel Ramos -
Higher (David Penn Remix)`, `Airdraw, Jo.E & Aaren - Bryde's Whale (New Ordinance Edit)`, `Jaded - Can You
Feel It (Luttrell Remix)`. Alleen de eerste staat in de bibliotheek; de regels zijn uit de vorm van alle
drie afgeleid.

### CREATE

- [x] `fileName.ts`: artiesten zonder remixers en featurings, `A, B & C`, elk ` - stuk` tussen haakjes, Windows-veilig
- [x] `artistsNamedIn()` in `primaryArtist.ts`, gedeeld met de remixer-regel
- [x] `dkj_file` in `fields.ts`, gevuld bij het aanmaken (`metadataOf`) en bij elke sync (`fillFileNames`)
- [x] Alle 12.471 tracks gevuld
- [x] README bijgewerkt

### TEST

- [x] typecheck, eslint en vitest groen, met `fileName.test.ts` op Dave's voorbeelden en de randgevallen
- [x] Steekproef op de hele bibliotheek; drie fouten gevonden en gerepareerd vóór het vullen (twee remixers, een remixer die de titel korter noemt, featuring zonder haakjes)

### DEPLOY: feat/dkj-file-field

#### What does the change on this branch deploy to main?

##### Tier 0

Het Trackregister krijgt de kolom `dkj_file`: de bestandsnaam zoals op de desktop, zonder extensie.
`Higher - David Penn Remix` van Abel Ramos en David Penn wordt `Abel Ramos - Higher (David Penn Remix)`.
Remixers en featurings staan alleen in de titel, niet nog eens bij de artiesten; elk stuk na ` - ` komt
tussen haakjes, en tekens die Windows weigert, gaan eruit. Alle 12.471 tracks zijn gevuld.

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

Trackregister krijgt de kolom dkj_file (de bestandsnaam zoals op de desktop)

