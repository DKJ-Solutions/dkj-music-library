## fix/lan-dev-origin

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

Dave: via http://192.168.178.123:3000/spotify/trackregister werkten de knoppen in de tabel niet meer.
Gemeten in headless Chrome: via het LAN-adres komt er geen `[HMR] connected`, hydrateert de pagina niet
en doet een klik op een sorteerkop niets, zonder één consolefout. Via 127.0.0.1 werkt alles.
`allowedDevOrigins` stond alleen 127.0.0.1 toe.

### CREATE

- [x] `allowedDevOrigins` staat ook `192.168.*.*` toe

### TEST

- [x] Opnieuw gemeten via het LAN-adres: de pagina hydrateert, sorteren werkt en het playlistmenu gaat open
- [x] typecheck en lint groen

### DEPLOY: fix/lan-dev-origin

De app werkt nu ook als je hem opent via het adres van de machine in het thuisnetwerk
(`192.168.x.x:3000`), en niet alleen via `127.0.0.1`. Tot nu toe blokkeerde Next.js daar de
dev-verbinding. De pagina kwam dan wel binnen, maar sorteren, de menu's en de filters in het
trackregister deden niets.

**Score:** 3

#### What makes this deploy extra special

Dave kan het register vanaf een ander apparaat in huis gebruiken.

**Score:** 3

#### Pull Request

Het trackregister werkt ook via het LAN-adres van de dev-server

