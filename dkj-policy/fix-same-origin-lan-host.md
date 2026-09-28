## fix/same-origin-lan-host

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

Dave kreeg op http://192.168.178.123:3000 `cross_origin_forbidden` bij de sync. Gemeten: de browser
stuurt daar geen `Sec-Fetch-Site` (alleen op een beveiligde origin), dus de guard viel terug op de
Origin-vergelijking, en die vergeleek met `request.url`, dat Next dev altijd als `localhost:3000` bouwt.
Met Origin `localhost` kwam een POST door, met Origin `192.168.178.123` niet.

### CREATE

- [x] `sameOrigin.ts`: de Origin vergelijken met de `Host`-header (terugval: `request.url`); een onleesbare Origin (`null`) wordt geweigerd

### TEST

- [x] `sameOrigin.test.ts`: LAN-host door, andere host geweigerd, Origin `null` geweigerd
- [x] Live tegen de dev-server: Origin 192.168.178.123 met die Host komt door (400 van de route zelf), evil.example.com krijgt 403
- [x] `vitest run`, `tsc --noEmit`, `eslint` (lint gate)

### DEPLOY: fix/same-origin-lan-host

De knoppen die iets opslaan (sync, afvinken, uitloggen) werken nu ook als je de app opent via het
LAN-adres, bijvoorbeeld http://192.168.178.123:3000. De beveiliging tegen verzoeken van andere sites
vergelijkt nu met het adres dat de browser werkelijk aansprak, in plaats van met `localhost`.

**Score:** 3

#### What makes this deploy extra special

Wie de app op een ander apparaat in huis opent, kan weer syncen in plaats van een foutmelding te krijgen.

**Score:** 3

#### Pull Request

sync en andere knoppen werken ook via het LAN-adres
