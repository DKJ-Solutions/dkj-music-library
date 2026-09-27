## feat/dkj-artist-remixer

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

Dave's regel voor `dkj_artist`: de artiest die de remix of edit maakte, heeft altijd voorrang. Gemeten op
de 12.471 tracks: 1.254 noemen in het versiedeel van de titel een artiest die ook bij de track staat; 223
noemen een naam die niet bij de track staat, en daar zitten evenveel stijlen ("Techno Mix", "Remastered
Mix", "Disco Edit") als echte remixers ("Lenzman Remix") tussen. Deze branch neemt alleen de eerste groep:
een naam die Spotify niet bij de track noemt, is uit de titel alleen niet betrouwbaar van een stijl te
onderscheiden.

### CREATE

- [x] `primaryArtist.ts`: versiedeel van de titel, remixer = de eerstgenoemde artiest van de track daarin, anders de eerste artiest
- [x] Aangesloten op het aanmaken (`metadataOf`) en het aanvullen (`fillPrimaryArtists`); `fillAlbumArtists` deelt nu dezelfde helper
- [x] Bestaande data eenmalig omgezet, alleen waar `dkj_artist` nog de oude automatische waarde (de eerste artiest) had: 1.214 tracks, 0 met de hand ingevuld
- [x] README bijgewerkt

### TEST

- [x] typecheck, eslint en vitest groen, met `primaryArtist.test.ts` en een remix-test in `artistIds.test.ts`
- [x] Steekproef op korte namen (CRi, W&W, 1991, MK, NCT, PNAU ...): allemaal de echte remixer

### DEPLOY: feat/dkj-artist-remixer

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_artist` volgt nu Dave's regel: de artiest die de remix of edit maakte, gaat voor. Staat een van de
artiesten van de track in het versiedeel van de titel (`Filmic - CRi Remix`, `Falling (JORDAZ Radio
Mix)`), dan is die het; anders blijft het de hoofdartiest. Een naam die alleen in de titel staat en niet
bij de track, telt niet. Bij 1.214 bestaande tracks is `dkj_artist` daarmee veranderd, bijvoorbeeld
`New Rules - Alison Wonderland Remix` → Alison Wonderland.

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

dkj_artist: de remixer of editor gaat voor

