## feat/preparation-card

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

Een nieuwe card Preparation op de hub /mixen, met daaronder een kaart per Spotify-playlist die op "Vol. X"
eindigt (de werkbakken), elk met een eigen pagina -- zoals Published een card per mix heeft.

### CREATE

- [x] `lib/mixes/preparation.ts`: welke playlists een werkbak zijn (`Vol. X` aan het eind, ook `Vol X`,
  `Vol. x` en een dubbele spatie), de volgorde en de route
- [x] `/mixen/preparation`: een card-link per werkbak, met een stip in de kleur van de playlist
- [x] `/mixen/preparation/<id>`: de pagina per werkbak, met de naamgegevens, een link naar Spotify en de tracks
- [x] Preparation-card op /mixen, naast Published en Planned
- [x] Kruimelnamen per werkbak in de layout, bewaard tot de snapshot (30 MB) op schijf wijzigt

### TEST

- [x] `tsc`, eslint en vitest (`preparation.test.ts`, `pages.test.ts`) groen
- [x] In de draaiende app: 27 kaarten op /mixen/preparation, de laatste kruimel leest wat de h1 leest, een
  onbekend id geeft 404
- [ ] Visuele check door Dave

### DEPLOY: feat/preparation-card

Onder Mixen staat een nieuwe card, Preparation, met daaronder een kaart voor elke Spotify-playlist die op
"Vol. X" eindigt: de werkbakken waarin de tracks voor een mix al verzameld zijn maar de mix nog niet
gemaakt is. Elke kaart draagt een stip in de kleur van de playlist en opent een eigen pagina met de tracks
die er al in staan en een link naar de playlist op Spotify.

**Score:** 3

#### What makes this deploy extra special

Wie de app gebruikt, ziet in één overzicht welke mixen in voorbereiding zijn en hoe vol elke werkbak al is.

**Score:** 3

#### Pull Request

Preparation-card op /mixen, met een kaart per Vol. X-playlist

