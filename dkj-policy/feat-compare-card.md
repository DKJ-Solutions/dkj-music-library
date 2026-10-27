## feat/compare-card

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

Dave wil op de homepagina een card die de verschillen tussen zijn bronnen in kaart brengt: Spotify-playlists
naast de DJ Cylow-mixen, en de tracks op zijn pc naast Spotify. Hij koos een Engelse naam (Compare), liet de
bestaande brug verhuizen in plaats van hem te dubbelen, en wil de pc-vergelijking eerst als lege pagina: de
pc-map koppelen we later.

### CREATE

- [x] /compare als hub met twee cards, en een Compare-card op de homepagina
- [x] De brug verhuisd van /spotify/playlists/musicmoodcolours/mixen naar /compare/playlists-mixes, met een redirect vanaf het oude adres; de card op /spotify is weg, de tegel op de MMC-pagina en de link in MissingMixes wijzen naar het nieuwe adres
- [x] /compare/pc-spotify als lege pagina, met dezelfde vorm als /mixen/planned
- [x] Twee nieuwe iconen (compare, monitor) in PageCardGrid

### TEST

- [x] typecheck, eslint en vitest groen (67 bestanden, 926 tests), met een kruimelpad-test voor /compare
- [x] De vier routes geven een 200 in de draaiende dev-server, en het oude adres stuurt met een 307 door
- [x] Visuele check door Dave: gezien en akkoord

### DEPLOY: feat/compare-card

Op de homepagina staat een nieuwe card, Compare, met eronder twee vergelijkingen. Playlists ↔ Mixes is de
bestaande brug tussen de mixen van djcylow.com en de MMC-playlists, verhuisd vanaf zijn plek onder Music Mood
Colours (het oude adres stuurt door). PC ↔ Spotify staat er alvast als lege pagina, tot de pc-map gekoppeld is.

**Score:** 3

#### What makes this deploy extra special

De brug tussen mixen en playlists is nu direct vanaf de homepagina te bereiken, in plaats van drie lagen diep
onder Spotify, en er is een vaste plek voor de pc-vergelijking.

**Score:** 3

#### Pull Request

Compare-card op de homepagina, met Playlists ↔ Mixes en PC ↔ Spotify

