## feat/80-house-style-v3

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

Issue #80: adopt the DKJ-Solutions house style at `house-style-v3`, per the `house-style` skill of
dkj-solutions 5.20.0. A visible result, so the branch stops for the owner's look and opens no PR.

### CREATE

- [x] Vendor `house-style.css` (`src/styles/house/`) and `house-theme.js` (`public/house-style/`)
  from dkj-brandbook at `house-style-v3`, unchanged; both sha256 match the skill's table, and
  `.gitattributes` keeps their bytes (`-text`).
- [x] Load the house stylesheet before `main.scss`, and `house-theme.js` synchronously in `<head>`
  (`src/app/layout.tsx`), with this app's default pair Petrol (light) / Cyaan (dark).
- [x] Turn `_root.scss` into a domain layer: the app's own token names now point at house tokens,
  the emotion colours use `light-dark()` so they follow all twelve themes; `_reset.scss` no longer
  sets what the house base sets (body ground, text colour, font, link colour).
- [x] Replace the retired names `--ink`, `--muted`, `--surface` with `--primary-9`, `--primary-6`,
  `--primary-2` everywhere they were read.
- [x] Rename the app's own `.swatch` to `.color-dot` and `.meta` to `.mix-orphan-meta`: both are
  reserved house classes.
- [x] The settings button: `src/components/ThemeSettings.tsx` calls `DKJTheme.settings(el)` on a
  floating element in the root layout. The app had no theme toggle of its own to replace.
- [x] The CI gate `.github/workflows/house-style.yml` (reusable-house-style.yml), with the gate's
  three TypeScript false positives answered in `Get-HouseStyleAllowlist` (`scripts/repo-config.ps1`).

### TEST

- [x] `check-house-style.ps1`: OK at house-style-v3, both copies pinned, 3 answered by the allowlist.
- [x] typecheck, eslint and the vitest suite (919 tests) green.

### DEPLOY: feat/80-house-style-v3

The app now renders in the DKJ-Solutions house style: the page, cards, lines, text and headings take
their colours from the theme, and a round settings button at the top right opens a picker with the
twelve house themes and a reset. Without a choice the app shows Petrol on a light system and Cyaan on
a dark one; a choice is remembered on this device.

**Score:** 3

#### What makes this deploy extra special

The music library looks like the other DKJ-Solutions apps and can be given any of the twelve house
colours, and a fix to the shared look now arrives through the brand book instead of a local copy.

**Score:** 3

#### Pull Request

Adopt the DKJ-Solutions house style (house-style-v3) and its settings button

