## feat/trackregister-spotify-embed

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
> For tier 2 audiences: the user who relies on what this repo ships, and decides whether to take the next version -- a subscriber of a service, or the user of a tool, its own maintainer included. That reader and nobody else -- what matters only
> inside this repo belongs under the first `**Score:**`. If the change reaches that reader
> not at all, N/A is a complete answer and the common one. **One hop and no further:** where that
> reader is itself a business, ITS own customers sit one hop past this repo and are never the reader
> here -- they take nothing this repo ships. Name the party that runs the upgrade, and score
> against them.
>
> The phase arc, the marks and the whole form: `DEVELOPMENT-portable.md`, which ships
> with this workflow.

### PLAN

Optie 2 uit de verkenning (Dave, 29 september 2026): de Spotify-embed-iframe, zonder extra OAuth-scopes.
Optie 3 (Web Playback SDK) valt af, want die zou de bewust smalle scope-grens in `src/lib/spotify/config.ts`
oprekken.

- [x] `spotify_track_id` meenemen in `RegisterRow` (`register.ts`)
- [x] Een embed-URL-helper (`trackEmbed.ts`)

### CREATE

- [x] Een afspeelknop vóór de titel in de kolom dkj_title (`PlayButton`)
- [x] Eén speler onderin het tabelkader (`Player`), die omhoog schuift als een track begint en omlaag bij sluiten (Dave); met een sluitknop als rond knopje op de linkerbovenhoek van de speler (Dave: rechts was het te druk), en zonder animatie bij prefers-reduced-motion
- [x] Terugval voor `animationend`: in een tabblad dat niet in beeld is slaat de browser de animatie over, en dan bleef de speler halverwege het sluiten hangen -- gemeten in Chrome; nu sluit een timer hem na 300ms
- [x] Styling in `_track-register.scss`; het afspeel- en stopicoon als SVG, zodat het in het midden van de cirkel staat (Dave)
- [x] Eén klik: de speler via Spotify's iFrame API (`loadSpotifyIframeApi`), die hem zelf start; de kale embed blijft de terugval (Dave: twee klikken was er één te veel)

### TEST

- [x] Fixtures bijgewerkt, en tests voor de speler en voor een track zonder `spotify_track_id`
- [x] typecheck, eslint en vitest groen (65 files, 910 tests)
- [x] In Chrome op de dev-server nagelopen: de eerste track en een volgende track starten allebei met één klik; de speler schuift onderin het tabelkader in en bij sluiten weer weg
- [~] Automatische browsertest van de embed zelf -- dat is een iframe van Spotify, niet te testen in jsdom; de tests geven de component een nep-API

### DEPLOY: feat/trackregister-spotify-embed

In het trackregister staat vóór elke titel een afspeelknop. Eén klik laat onderin het tabelkader een Spotify-speler
omhoog schuiven en start de track meteen (via Spotify's iFrame API). De speler blijft staan terwijl je door de tabel scrollt, filtert of bladert. Nog een klik op
dezelfde knop, of op het kruisje linksboven op de speler, sluit hem weer. Ben je in dezelfde browser bij Spotify ingelogd,
dan speelt de hele track, anders een fragment van 30 seconden. Er zijn geen extra OAuth-scopes nodig.

**Score:** 3

#### What makes this deploy extra special

N/A -- het trackregister is een eigen werkpagina, en bereikt geen andere gebruiker.

**Score:** N/A

#### Pull Request

Spotify-speler in het trackregister

