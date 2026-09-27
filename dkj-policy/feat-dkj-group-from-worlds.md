## feat/dkj-group-from-worlds

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

Dave: vul `dkj_group` in; een Spotify-playlist met een beschrijving hoort sowieso bij MMC, en een track in
meer dan één wereld krijgt een menu. Dus `dkj_group` wordt een lijst: de werelden (classifyWorld plus de
handmatige correcties) van de playlists van de track. Gemeten: 872 tracks liggen in meerdere werelden
zonder de beschrijvingsregel. `Overige` wordt niet afgeleid; daar is geen regel voor.

### CREATE

- [x] `options` ook bij `json`-velden: elk element moet een optie zijn, dubbelen vallen weg, volgorde van de options (`trackStore.ts`, `fields.ts`)
- [x] `dkj_group` van `text` naar een `json`-lijst (het veld was overal nog leeg)
- [x] `groupFromWorlds.ts`: per playlist de groep van zijn wereld plus MMC bij een beschrijving, per track alle groepen; alleen zolang het veld leeg is
- [x] Aangesloten op de sync (`api/spotify/sync`) en `library:assign-ids`, met de verrijkte snapshot voor de werelden
- [x] Echte data: alle 12.471 tracks gevuld; 2.088 met meer dan één groep
- [x] README bijgewerkt

### TEST

- [x] typecheck, eslint en vitest groen, met `groupFromWorlds.test.ts` en tests voor optielijsten

### DEPLOY: feat/dkj-group-from-worlds

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_group` is nu een lijst en wordt gevuld uit de werelden van de Spotify-playlists van een track: MMC,
DJ CYLOW en Prive, en een playlist met een beschrijving telt sowieso als MMC. Een track in meer werelden
krijgt meer groepen. Alle 12.471 tracks zijn gevuld: 9.662 alleen Prive, 409 alleen MMC, 312 alleen DJ
CYLOW en 2.088 met meer dan één groep. `Overige` zet je zelf.

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

dkj_group wordt een lijst en wordt afgeleid uit de werelden van de playlists

