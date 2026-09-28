## feat/classic-pop-page

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

Dave vroeg om een nieuwe pagina met één tabel van alle nummers uit de playlists met "Classic Pop" in de
naam. De snapshot heeft er 33 (de hoofdplaylist `Classic Pop | DJ Cylow` en 32 Music Mood Colours-kleuren),
samen 3.468 items maar 2.465 unieke nummers. Daarom één rij per nummer (per Spotify track-id), met een
kolom die zegt in welke Classic Pop-playlists het staat.

### CREATE

- [x] `classicPopTable.ts` (puur): rijtype, herkennen van een Classic Pop-playlist, zoeken (ook op playlistnaam), sorteren
- [x] `toClassicPopRows` in `playlistTableRows.ts`: ontdubbelen op track-id, playlists per nummer, vroegste toevoegmoment, jaar volgens dezelfde regel als de playlist-tabel
- [x] `readLibraryYears` van de Maple Classic-pagina naar `playlistTableRows.ts`, zodat beide pagina's hem delen
- [x] `ClassicPopTable.tsx` en de pagina `/spotify/classic-pop`, met sync-knop, plus een link op `/spotify`

### TEST

- [x] `classicPopTable.test.ts`: herkennen en labelen, ontdubbelen, playlists per nummer, jaar, zoeken, sorteren
- [x] vitest (61 bestanden, 854 tests), typecheck en eslint groen
- [x] `/spotify/classic-pop` rendert op de dev-server: 2.465 nummers, 1.286 artiesten, 33 playlists
- [ ] Dave bekijkt de pagina (zichtbaar resultaat, dus geen merge zonder zijn blik)

### DEPLOY: feat/classic-pop-page

Nieuwe pagina `/spotify/classic-pop`: elk nummer uit een playlist met "Classic Pop" in de naam, één keer,
met de playlists waarin het staat (aantal plus de korte namen, de volledige in de tooltip) en het vroegste
moment waarop het is toegevoegd. Zoeken werkt ook op playlistnaam, dus "cyan" toont één kleur. De tabel
sorteert standaard op artiest. `readLibraryYears` woont nu in `playlistTableRows.ts` en wordt door deze
pagina en de Maple Classic-pagina gedeeld.

**Score:** 3

#### What makes this deploy extra special

Wie de app gebruikt, heeft nu voor het eerst één overzicht van de hele Classic Pop-verzameling over alle
kleur-playlists heen, en ziet per nummer waar het staat.

**Score:** 3

#### Pull Request

Classic Pop-pagina: alle nummers uit de Classic Pop-playlists in één tabel

