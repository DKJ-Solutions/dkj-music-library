## feat/dkj-album-from-playlists

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

Dave vroeg of `dkj_album` uit de Spotify-playlists te achterhalen is. Gemeten: 281 van de 347 playlists
noemen een compleet album (kleur, Light/Full, f/m); per track 8.257 eenduidig, 2.452 met meerdere
verschillende albums, 1.762 zonder album-playlist. Dave koos: alleen de eenduidige vullen, de rest leeg
laten om zelf te kiezen.

### CREATE

- [x] `albumFromPlaylists.ts`: album per playlistnaam via `parsePlaylistName`, en per track alleen als alle album-playlists hetzelfde noemen
- [x] `fillAlbumsFromPlaylists()` in de sync, na het verversen van `dkj_playlists`; alleen zolang `dkj_album` leeg is
- [x] Echte data: 8.257 tracks gevuld
- [x] README bijgewerkt

### TEST

- [x] typecheck, eslint en vitest groen, met `albumFromPlaylists.test.ts` en een sync-test in `artistIds.test.ts`

### DEPLOY: feat/dkj-album-from-playlists

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_album` wordt nu uit de Spotify-playlists afgeleid: noemen alle playlists van een track hetzelfde
album (`Magenta Light (m) ♦️ 128BPM EDM` → Magenta Light (m)), dan krijgt de track dat album. Noemen ze
verschillende albums, of geen, dan blijft het leeg om zelf te kiezen. 8.257 van de 12.471 tracks hebben
zo hun album gekregen; de sync doet het voortaan bij elke nieuwe track.

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

dkj_album wordt afgeleid uit de playlists, als dat eenduidig is

