## fix/89-house-style-v5-33

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

#### Scope

Resolves #89 and #86 together: both come down to taking the house style at `dkj-policy` v5.33.0. #89
needs the new pinned copies of both files and the domain layer moved off the retired `--primary-*`
steps; #86 is the same `house-theme.js` copy plus `data-theme-default="pink"` on `<html>`.

The domain layer was on the nine-step scale of October 15, 2026, so the rename goes through the README's
October 19 and October 21 tables: `-1`/`-2`/`-3` to `--paper-1`/`-2`/`-3`, `-5` and `-6` to `--muted`, `-7`
to `--primary`, `-9` to `--fg-1` (`-4` and `-8` were not used). No domain surface is inverted, so no grey
needed `--muted-inverse`.

#### Waiting for the owner's look

A visible result: the whole app changes colour (pink by default, new paper and text steps in every
theme). Parked without a PR until Dave has looked at the dev server from this checkout.

### CREATE

- [x] `src/styles/house/house-style.css` and `public/house-style/house-theme.js`: the bytes served at
      `dkj-claude-plugins` v5.33.0, sha256 matching the `house-style` skill's pin
- [x] Domain layer: every retired `--primary-N` renamed (12 files under `src/`)
- [x] `src/styles/base/_root.scss`: `--font-mono` no longer defined here, the house style defines it now
- [x] `src/app/layout.tsx`: `data-theme-default="pink"` replaces the `teal`/`cyan` pair (#86)
- [x] `scripts/repo-config.ps1`: `DefaultTheme = 'pink'` in `Get-DevPreview`, so the hub opens in the
      product's theme (#87 step 5)

### TEST

- [x] `check-house-style` at v5.33.0: `[OK] the house style holds at v5.33.0`
- [x] Dev server renders `/` and `/spotify` (200) with `data-theme-default="pink"`
- [x] The owner's look at the app in this checkout: approved by Dave, October 26, 2026 ("gezien en akkoord")

### DEPLOY: fix/89-house-style-v5-33

The app now renders from the house style at `dkj-policy` v5.33.0, and opens in its own default theme, Roze (`pink`, dark), instead of the Petrol/Cyaan pair. `src/styles/house/house-style.css` and `public/house-style/house-theme.js` are the pinned v5.33.0 bytes, unchanged; the domain layer reads the new paper, primary, muted and text tokens instead of the retired `--primary-1` to `-9`, and takes `--font-mono` from the house style instead of defining its own. The plugin's hub opens in the same theme (`DefaultTheme = 'pink'`). The `house-style` CI check is green again.

**Score:** 3

#### What makes this deploy extra special

The library has a colour of its own: it opens in Roze unless you pick another theme in the settings panel.

**Score:** 2

#### Pull Request

Take the house style at v5.33.0, with pink as the default theme

