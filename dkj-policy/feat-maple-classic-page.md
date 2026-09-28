## feat/maple-classic-page

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

Dave vroeg om een eigen pagina met een tabel voor de Spotify-playlist `21C8ylLvP9fDneF86KAKlY`
(Maple Classic 2026 LAN, van Jellootje, 264 nummers). Die staat al in de snapshot, dus de pagina leest
de snapshot, zoals de wereld-routes. De tabel neemt de stijl van het Trackregister over.

### CREATE

- [x] `src/lib/spotify/playlistTable.ts`: de rij, zoeken, sorteerwaarde per kolom, duur, tracklink (puur)
- [x] `src/lib/spotify/playlistTableRows.ts`: rijen uit een snapshot-playlist (server, want `yearOf` trekt de database mee)
- [x] `src/components/spotify/PlaylistTable.tsx`: zoekveld, sorteerbare kop, tellers
- [x] `src/app/spotify/maple-classic/page.tsx` + een link bovenaan `/spotify`
- [x] README: korte sectie over de pagina
- [x] Jaar (Dave: "het jaar klopt niet altijd"): Spotify kent alleen het albumjaar, dus op een verzamelalbum of heruitgave staat het jaar van die uitgave. Nu wint het `year` uit het Trackregister (`libraryYearsBySpotifyId`), met het albumjaar in de tooltip als ze verschillen. Gemeten: 4 rijen verbeterd (o.a. 500 Miles 2003 -> 1988); 108 van de 264 nummers staan niet in de bibliotheek, dus daar blijft het albumjaar
- [x] Kolom "Toegevoegd door" (Dave): Spotify geeft alleen een user-id; de naam komt uit de eigenaren van de playlists in de snapshot (`userNamesFromSnapshot`), anders blijft het id staan. Ook doorzoekbaar

### TEST

- [x] `playlistTable.test.ts`: rijen, zoeken (accent-ongevoelig), sorteren (lege jaren onderaan), duur
- [x] Toevoeger: naam uit de snapshot, id als terugval, leeg als Spotify het niet weet; zoeken en sorteren
- [x] Jaar: bibliotheekjaar boven albumjaar, albumjaar apart bewaard; op de pagina 4 rijen met tooltip
- [x] `vitest run` (820 groen), `tsc --noEmit`, `eslint`
- [x] Pagina lokaal opgehaald: 200, 264 rijen, de link staat op `/spotify`; toevoegers Jellootje 151, Dave K. John 91, Bas van Leeuwen 22
- [x] Dave bekijkt de pagina (zichtbaar resultaat, dus geen merge zonder zijn woord) -- akkoord gegeven met "merge pr" (2026-09-28)

### DEPLOY: feat/maple-classic-page

Nieuwe pagina `/spotify/maple-classic`: de playlist Maple Classic 2026 LAN als tabel met positie,
titel (link naar Spotify), artiest, album, jaar, duur, datum van toevoegen en wie het nummer toevoegde. Het jaar komt uit het Trackregister als het
nummer daarin staat, zodat een verzamelalbum het niet jonger maakt; anders is het het albumjaar van Spotify.
Je kunt zoeken op titel, artiest, album of toevoeger en sorteren op elke kolom. Bovenaan `/spotify` staat een link ernaartoe.

**Score:** 3

#### What makes this deploy extra special

De gebruiker van de app heeft een nieuwe pagina om deze LAN-playlist te bekijken en te doorzoeken.

**Score:** 3

#### Pull Request

eigen pagina met tabel voor de playlist Maple Classic 2026 LAN

