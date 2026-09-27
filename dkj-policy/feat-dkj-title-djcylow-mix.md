## feat/dkj-title-djcylow-mix

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

Twee nieuwe kolommen in het trackregister (Dave, 27 september 2026): `dkj_title` met alleen de titel,
en `djcylow_mix` dat, net als `spotify_playlist`, naar de mix op djcylow.com wijst waarin de track zit.
`dkj_file` verdwijnt daarna uit de tabel. De koppeling track -> mix loopt via de bestaande brug
(mix -> eigen MMC-playlist) en dus op Spotify-ID, niet op de tracklist-tekst.

### CREATE

- [x] `dkj_title` in het schema, afgeleid met `titleNameOf` (fileName.ts), gevuld bij nieuwe en bestaande tracks, en mee bij het schoonmaken van live-titels
- [x] `slug` op `Mix` (mixStore.ts), zoals de website hem uit `permalink` afleidt
- [x] `djcylow_mix` in het schema, met `djcylowMix.ts` (link) en `djcylowMixes.ts` (plan + schrijven), aangesloten op de sync-route en `library:assign-ids`
- [x] Trackregister: `dkj_file` en `dkj_artist` verborgen, `dkj_title` en `djcylow_mix` erbij, playlist- en mixlinks via één component
- [x] Registertabel in Bahnschrift SemiCondensed (token `--font-narrow`), `.register-tag` zonder padding en achtergrond
- [x] Export gevuld (`library:assign-ids` met de mix-bron uit djcylow-react)
- [x] README bijgewerkt

### TEST

- [x] `tsc --noEmit`, `eslint` en `vitest run` groen (55 bestanden, 779 tests)
- [x] Steekproef in de export: 12.460 tracks met een `dkj_title`, 1.442 tracks in 48 mixen; een gegenereerde mixlink geeft HTTP 200

### DEPLOY: feat/dkj-title-djcylow-mix

Het trackregister heeft twee nieuwe kolommen. `dkj_title` toont alleen de titel van het nummer, in de
vorm van `dkj_file` na de artiesten, en vervangt `dkj_file` in de tabel (zoeken op `dkj_file` kan nog).
De tabel staat in een smaller lettertype (Bahnschrift SemiCondensed), en de labels voor BPM, album en groep hebben geen achtergrond meer. Ook `dkj_artist` staat niet meer in de tabel; `dkj_albumartiest` toont de artiesten al. `djcylow_mix` noemt de mixen op djcylow.com waarin een track zit en linkt naar hun pagina, net zoals
`spotify_playlist` naar Spotify linkt. Een track zit in een mix als hij in de eigen MMC-playlist van
die mix staat; zonder mix-bron op de machine blijft het veld zoals het was.

**Score:** 3

#### What makes this deploy extra special

N/A: het register is een lokaal werkinstrument; geen abonnee ziet het.

**Score:** N/A

#### Pull Request

dkj_title en djcylow_mix in het trackregister, dkj_file en dkj_artist verborgen
