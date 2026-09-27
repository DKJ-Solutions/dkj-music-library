## feat/trackregister-page

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

Dave wil het Trackregister gegarandeerd op elke machine en met elk Claude-account kunnen bekijken. Het
artifact dat er was (claude.ai) hangt aan één account, en delen buiten de organisatie staat uit, dus dat
kan het niet. De app wel: de export staat in git en de bibliotheek bouwt zich op een verse kloon zelf op.

### CREATE

- [x] `register.ts`: pure rijen, zoeken (zonder accenten) en filteren op `dkj_bpm`/`dkj_album`, inclusief "leeg"
- [x] `readArtistNames()` in `artistIds.ts`, `DKJ_BPM_OPTIONS` in `fields.ts`
- [x] Pagina `/spotify/trackregister` (Server Component) + `TrackRegister.tsx` (tabel, filters, 100 per pagina)
- [x] Stijl in `_track-register.scss`, hergebruikt `.stat`, `.playlist-search` en de `--emotion-*`-kleuren
- [x] Link in de kop van `/spotify`, buiten de snapshot-secties, zodat hij ook zonder sync zichtbaar is
- [x] README: hoe je het register opent
- [x] Titel en `dkj_albumartiest` elk een eigen kolom (Dave, na het eerste bekijken)
- [x] Kolom `dkj_file` erbij, na #18; ook doorzoekbaar
- [x] Volle breedte van het venster, tabel in een eigen scrollvak met vaste kolomkoppen (Dave)
- [x] Kolom Titel weg: `dkj_file` neemt zijn plek in (Dave); zoeken op titel werkt nog
- [x] Kolom `dkj_playlists` na #19: één playlist is een label dat hem op Spotify opent, meer dan één een menu met alle playlists als link (Dave); ook doorzoekbaar

### TEST

- [x] typecheck, eslint en vitest groen (707 tests), met `register.test.ts` en `TrackRegister.test.tsx`
- [x] Verse kloon nagespeeld: een lege database bouwt zich op uit de export (12.471 tracks, 6.951 artiesten)
- [x] `next dev`: `/spotify/trackregister` geeft 200 met 100 rijen, de link op `/spotify` staat er

### DEPLOY: feat/trackregister-page

#### What does the change on this branch deploy to main?

##### Tier 0

Het Trackregister is nu een pagina in de app: `/spotify/trackregister`, met een link bovenaan `/spotify`.
Je ziet elk nummer met `dkj_track_id`, `dkj_artist`, `dkj_albumartiest`, `dkj_artist_ids`, `dkj_bpm`,
`dkj_album` en `dkj_file`, zoekt zonder op accenten te letten en filtert op `dkj_bpm` en `dkj_album` (ook op "leeg"). De
pagina leest de bibliotheek uit de export in git, dus hij werkt op elke kloon, zonder Spotify-login, sync
of Claude-account.

**Score:** 4

<!--
     Is this change also relevant to management and the employer/commissioner? Then continue to Tier 1.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 1

Een eigen werkpagina; management merkt hier niets van.

**Score:** N/A

<!--
     Is this change also relevant to a subscriber of the service? Then continue to Tier 2.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

Het Trackregister als pagina in de app (/spotify/trackregister)

