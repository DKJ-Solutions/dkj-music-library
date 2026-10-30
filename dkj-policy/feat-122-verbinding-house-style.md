## feat/122-verbinding-house-style

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

Owner asked for /spotify/verbinding in the house style; #122 (unclear re-auth error, barely visible login button) is fixed in the same pass.

### CREATE

- [x] Page reduced to two house `.card`s in a `.grid-2` (owner): card 1 holds login status, the login button (`btn--primary`) or Loskoppelen, login errors and the host note; card 2 holds the sync
- [x] No lede/kicker/worlds block; host-mismatch note in plain words
- [x] SyncButton: back-up card with facts, sync disabled until connected; reauth error carries its own login button and refreshes the server status
- [x] Vendored `house-style.css` replaced with the pinned copy (#109), now v6.1.0 (headed grids no longer take a margin-top), so the house grid padding and panel apply; `.card--thumb` renamed to the domain class `.thumb-card` and its house-class compositions written flat, so `check-house-style` holds (nested-SCSS false positive filed upstream as dkj-marketplace#3694)
- [x] /spotify rebuilt as a house `.page-column` with three h2 sections (owner): Connection (Instructions on the left over two rows, Login and Sync stacked on the right, `ConnectionCards.tsx`), Playlists (the cards shared with /spotify/playlists via `playlistCards.ts`), Dashboard (dashboard + trackregister); /spotify/verbinding redirects to /spotify with its query, OAuth callback/logout and all in-app links point at /spotify
- [x] Compact variant (button + outcome) kept for the classic-pop and maple-classic page heads

### TEST

- [x] `tsc --noEmit`, eslint and `npm test` green
- [x] DOM check at full width: cards side by side, no page scroll, login button filled in the theme colour

### DEPLOY: feat/122-verbinding-house-style

/spotify is now one page in three sections: Connection (an Instructions card with tips, a Login card with the login action as the filled primary button, and a Sync card), Playlists and Dashboard. /spotify/verbinding forwards there, so old links keep working. The vendored house stylesheet is now the v6.1.0 copy, so every grid in the app gets the house padding and panel background, and the house-style check is green again. A sync that fails because the Spotify login expired now says so in plain words with its own login button, and the status card updates to "Niet verbonden" instead of still claiming a connection.

**Score:** 3

#### What makes this deploy extra special

The owner can see at a glance whether Spotify is connected and how to log in again, without hunting for a hidden button.

**Score:** 3

#### Pull Request

De Spotify-verbindingspagina in de huisstijl

