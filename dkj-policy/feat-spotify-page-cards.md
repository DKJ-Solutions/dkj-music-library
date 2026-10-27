## feat/spotify-page-cards

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

Dave asked to move every home card except Spotify to the Spotify page. The card grid becomes a shared
component; the text links on /spotify that the new cards duplicate (trackregister, Maple Classic,
Classic Pop, data dashboard) go.

### CREATE

- [x] `src/components/PageCardGrid.tsx`: the hub card grid, shared by home and /spotify
- [x] Home keeps only the Spotify card
- [x] /spotify shows the other eight cards in a "Pagina's" section under the masthead, outside the snapshot sections, and drops the duplicate text links
- [x] Dave's follow-up: the playlist manager gets its own card -- it moves off /spotify to its own page, `/spotify/playlists`, first in the grid; /spotify is retitled "Spotify" and becomes the hub (cards, connection, sync, worlds)
- [x] The "← Terug naar alle playlists" back links on the sub-pages read "← Terug naar Spotify", since /spotify no longer lists the playlists
- [x] Dave's follow-up: breadcrumbs across the whole site, modelled on the hub. `src/lib/pages.ts` holds every page's name once; `Breadcrumbs.tsx` (in the layout, under the site header) builds the trail from the route, and every h1 and card label reads the same name, so the h1 always equals the current crumb
- [x] The back links ("← Terug naar Spotify", "← Terug naar MMC") and their `.world-back-link` style go: the bar is the way back, as the house style lays down
- [x] The playlist toolbar sticks at `top: var(--tap)`, under the bar; the track register's full-height page is one `--tap` shorter so its pager stays in view

### TEST

- [x] `tsc --noEmit` and eslint on the three files green
- [x] The running dev server renders nine cards on /spotify, only Spotify on home, and the playlist table on /spotify/playlists
- [x] vitest over `src/components/spotify` green (113 tests)
- [x] `src/lib/pages.test.ts` for the trail; full vitest green (919 + 5), tsc and eslint over `src` green
- [x] Every route on the dev server: the trail runs Home > ... > the page, and the h1 equals the current crumb on all eleven pages with an h1
- [ ] Dave's visual review of home and /spotify

### DEPLOY: feat/spotify-page-cards

The home page now holds only the Spotify card; the pages under Spotify are cards on /spotify itself,
rendered by one shared `PageCardGrid` component, and the text links they replace are gone. The playlist
manager moved off /spotify to its own page, `/spotify/playlists`, with its own card; /spotify is now the
hub for the cards, the connection, the sync and the worlds. Every page now opens with the house-style
breadcrumb bar (Home > Spotify > ... > the page), fed from one name registry (`src/lib/pages.ts`) that the
h1s and card labels read too; the pages' own back links are gone.

**Score:** 2

#### What makes this deploy extra special

The pages under Spotify are now reached from the Spotify page rather than from home, and the playlist
manager lives at `/spotify/playlists` instead of on /spotify itself. Every page shows where it sits in a
breadcrumb bar, which replaces the per-page back links.

**Score:** 3

#### Pull Request

The page cards move from home to the Spotify page

