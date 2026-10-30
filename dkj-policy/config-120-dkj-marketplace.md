## config/120-dkj-marketplace

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

De plugin-source heet sinds v6.0.0 `dkj-marketplace` (DKJ-Solutions/dkj-marketplace#3660). Deze branch
verhuist de repo zoals dkj-lifehub#599 dat deed. Proza die alleen geschiedenis vertelt en issue-verwijzingen
houden de oude naam; `always-on-baseline.json` schrijft de budget-gate zelf bij.

### CREATE

- [x] `.claude/settings.json`: de `enabledPlugins`-keys op `@dkj-marketplace` (`dkj-policy-bwj` heet nu
      `bwj-development`), plus `extraKnownMarketplaces` volgens `plugins/ADOPTION.md`
- [x] Absolute `@`-imports in `CLAUDE.md` en `SPECIALISTS.md`, en de persona-paden in vier lenzen
- [x] De zeven workflows in `.github/workflows/`: `uses:` en `repository:` op `DKJ-Solutions/dkj-marketplace`
- [x] `publish-library.ps1`: zoekt dkj-policy in het register onder beide namen, zodat een machine die nog
      niet opnieuw heeft geïnstalleerd blijft werken

### TEST

- [x] `settings.json` is geldige JSON, `publish-library.ps1` parseert, en de reusable workflows bestaan in
      `dkj-marketplace`. De overige gates laat ik aan `ship-pr`.

### DEPLOY: config/120-dkj-marketplace

Deze repo installeert zijn plugins nu uit `dkj-marketplace`, de nieuwe naam van de plugin-source sinds
v6.0.0 ([#120](https://github.com/DKJ-Solutions/dkj-music-library/issues/120)): de settings-keys, de
absolute imports en de CI-runners noemen die naam. Per machine worden de plugins één keer opnieuw
geïnstalleerd.

**Score:** 3

#### What makes this deploy extra special

N/A -- alleen de maintainer van deze repo ziet uit welke marketplace hij installeert.

**Score:** N/A

#### Pull Request

Naar de dkj-marketplace-marketplace verhuizen

