## feat/house-style-v0-2-0

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

Bring this repo's vendored house style from `house-style-v3` to the brand book's latest release, `v0.2.0`, the tag the `dkj-solutions` v5.23.0 `house-style` skill pins.

### CREATE

- [x] Replace `src/styles/house/house-style.css` and `public/house-style/house-theme.js` with the files served at `v0.2.0`, unchanged (sha256 `4527c1c8...` and `294c9543...`, matching the skill's table; the theme script makes no network call, no `eval`, and the stylesheet has no `@import` or remote `url()`)
- [x] Answer the gate's one false positive in `scripts/repo-config.ps1` (`Get-HouseStyleAllowlist`): `.sort` in `src/lib/library/registerPrefs.test.ts` is a property of a parsed prefs object, not a CSS class -- the same case as the two `.sort` entries already there

### TEST

- [x] `check-house-style` (dkj-solutions v5.23.0) passes: both copies pinned at v0.2.0, no redefinition, no retired token
- [x] An owner has looked at the app with the v0.2.0 copy and approved it (Dave, October 26, 2026: "rond deze branch af")
### DEPLOY: feat/house-style-v0-2-0

The app now renders from the brand book's house style at `v0.2.0` instead of `house-style-v3` (a tag the brand book has since deleted): `src/styles/house/house-style.css` and `public/house-style/house-theme.js` are the bytes served at that tag, unchanged, and match the `dkj-solutions` v5.23.0 pin. The repo's own layer needed no change: it reads no token v0.2.0 retired. The gate's one new hit, ``.sort`` as an object property in a test, is answered in ``Get-HouseStyleAllowlist`` beside the two ``.sort`` entries already there. The visible change is the house style's own: the grey steps `--primary-4` to `-6` are greyer in every theme, and the settings panel's open toggle and title take the theme colour (`--primary-7`).

**Score:** 2

#### What makes this deploy extra special

N/A -- the same app in slightly greyer neutrals; nothing new for its user to learn or decide.

**Score:** N/A

#### Pull Request

Take the house style at v0.2.0
