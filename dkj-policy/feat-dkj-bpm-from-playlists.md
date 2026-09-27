## feat/dkj-bpm-from-playlists

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

Dave: vul `dkj_bpm` zoveel mogelijk uit de Spotify-playlists. Gemeten op 12.471 tracks: 6.968 krijgen
precies één BPM uit hun playlists (een BPM in de naam, of de vaste MMC-regels: House Mix 128, Drum & Bass
Mix 176), 33 krijgen verschillende BPM's, 5.470 staan alleen in playlists zonder BPM (Top 100, ALT,
Classic Pop, Feestzaal). Voor "zoveel mogelijk" twee uitbreidingen: D&B/DNB in de naam is 176 (sluit aan
op Dave's vaste Drum & Bass-regel, +469 tracks), en bij verschillende BPM's wint de meest genoemde, met
leeg bij een gelijke stand.

### CREATE

- [x] `bpmFromPlaylists.ts`: per playlist `classifyMmcBpm`, dan de BPM uit de naam (ook 144), dan D&B/DNB → 176; per track de meest genoemde
- [x] `fillBpmsFromPlaylists()` in de sync, na het album; alleen zolang `dkj_bpm` leeg is
- [x] Echte data: 7.454 tracks gevuld (128BPM 3.203, 176BPM 3.612, 112BPM 639)
- [x] README bijgewerkt

### TEST

- [x] typecheck, eslint en vitest groen, met `bpmFromPlaylists.test.ts` en een sync-test in `artistIds.test.ts`

### DEPLOY: feat/dkj-bpm-from-playlists

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_bpm` wordt nu uit de Spotify-playlists afgeleid: een BPM in de playlistnaam (`128BPM EDM`), House
Mix is 128, Drum & Bass en D&B/DNB zijn 176. Noemen de playlists verschillende BPM's, dan wint de meest
genoemde; bij een gelijke stand blijft het leeg. 7.454 van de 12.471 tracks hebben zo hun BPM gekregen;
de sync doet het voortaan bij elke nieuwe track.

**Score:** 4

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

dkj_bpm wordt afgeleid uit de playlists

