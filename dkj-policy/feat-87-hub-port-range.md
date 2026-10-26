## feat/87-hub-port-range

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

#87 asks for four things. Two are taken here: drop `Name` from `Get-DevPreview` (ignored since
DKJ-Solutions/dkj-claude-plugins#3245) and route the hub's ports 4890-4899 to the Simple Browser. The
third, moving the product to 3010-3019 bound to 127.0.0.1, collides with two decisions recorded in
the code: the Spotify redirect URI is registered on `127.0.0.1:3000` (`src/lib/spotify/config.ts`), and
the app is deliberately used from the LAN address (`next.config.ts`, `src/lib/http/sameOrigin.ts`). It
stays open on #87 as the owner's decision. `DefaultTheme` waits for #86, which moves the product to
`pink`; until then the product does not open in one theme the hub could state.

### CREATE

- [x] `scripts/repo-config.ps1`: `Name` dropped from `Get-DevPreview`, its comment names the hub and
      why the port stays
- [x] `.vscode/settings.json`: `localhost:4890` to `localhost:4899` open in the Simple Browser

### TEST

- [x] Verified by the gates `ship-pr` runs; the session check named exactly these two drifts
      (`OpenInVsCode but no hub port routed`, `Get-DevPreview states Name`)

### DEPLOY: feat/87-hub-port-range

The plugin's hub now opens in VS Code's Simple Browser instead of the system browser: `.vscode/settings.json` routes all ten hub ports (`localhost:4890` to `4899`) beside the product's `localhost:3000`. `Get-DevPreview` no longer states `Name`, which the hub stopped reading. The product stays on port 3000 without a loopback bind, because the Spotify login and the LAN use depend on both; whether to move it is open on #87.

**Score:** 2

#### What makes this deploy extra special

N/A -- the hub opens beside the conversation instead of in a separate browser window; nothing to learn or decide.

**Score:** N/A

#### Pull Request

Route the plugin's hub to the Simple Browser and drop the ignored Name

