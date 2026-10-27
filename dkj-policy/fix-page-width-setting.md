## fix/page-width-setting

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

The width setting (Fluid / Phone / Full in the settings panel) did nothing on the `.wrap` pages:
`.wrap` set its own `max-width: 1080px`, which outweighs the house style's `:where(:root[data-width])
main` rule. `.wrap` always sits on `<main>`, and the house `main` rule already gives the same 1080px
column, so the fix is to drop the duplicate.

### CREATE

- [x] Remove `max-width` from `.wrap` in `src/styles/layout/_masthead.scss`, with a comment saying why
- [x] De-duplicate `/spotify` (owner, during the width review): the three world pages were linked twice,
  as a card and as a world tile. The tiles are gone; their playlist count moved into the card's subline
  when a snapshot exists. The Werelden section keeps its explanation and the coverage note.
- [x] The connection gets its own page and card (owner: "so everything can sit in one grid"):
  `/spotify/verbinding` holds the status, login/logout, the sync and the world coverage note;
  `/spotify` is the card grid alone. The OAuth callback and logout return to the new page, its name is
  in `src/lib/pages.ts`, `SyncButton.tsx` moved with it, and every "start a sync on /spotify" link
  points at it.

### TEST

- [x] Measured in the running app (`/spotify/dashboard`, viewport 1718px): Fluid 1080px, Full 1703px, Phone 360px
- [x] Checked every page's `<main>`: all are `.wrap` (now governed by the house rule), `.page-column` on `/` (already was), or `.wrap--full` (track register and classic-pop, always full on purpose)
- [x] `/spotify` in the running app: every link appears once; the world cards read e.g. "· 79 playlists"
- [x] `npx vitest run`: 67 files, 924 tests green; `tsc --noEmit` and eslint clean
- [x] `/spotify` renders one grid of ten cards (the connection card reads "· verbonden");
  `/spotify/verbinding` renders with crumbs Home › Spotify › Verbinding, the status, the sync button
  and the coverage note; tsc, eslint and 924 tests green
- [x] The intro line under the `/spotify` title removed (owner)
- [x] Owner's look at the pages in Full width, at `/spotify` and at `/spotify/verbinding` -- approved ("ship it")

### DEPLOY: fix/page-width-setting

Every page now follows the width chosen in the settings panel; before, only the home page and the
always-full tables did, and the other pages stayed at 1080px whatever was picked. `/spotify` links
each world page once, as a card that also shows its playlist count, and is now one grid of cards: the
connection (status, login, sync) has its own page, `/spotify/verbinding`, where logging in and out now
lands.

**Score:** 3

#### What makes this deploy extra special

Picking "Full" now actually widens the Spotify pages for the person using the app.

**Score:** 3

#### Pull Request

Every page follows the width setting, and /spotify is one grid of cards

