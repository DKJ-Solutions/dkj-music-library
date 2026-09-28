## feat/45-musicbrainz-release-year

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

Issue #45: Spotify kent per track alleen het albumjaar, dus verzamelalbums en heruitgaven tonen een te
jong jaar. Dave koos route 1 (28 september 2026): het jaar van eerste uitgave bij MusicBrainz
opzoeken, met een lokale cache. Een los script haalt het op, met hooguit 1 verzoek per seconde; de
pagina's lezen alleen de cache en doen zelf geen netwerkverzoeken.

### CREATE

- [x] `src/lib/musicbrainz/releaseYear.ts`: zoekopdracht, titelopschoning (live, remaster, demo, radio edit, single version) en de keuze uit de response (score >= 90, artiest in de credit, vroegste `first-release-date`)
- [x] `src/lib/musicbrainz/cacheStore.ts`: `data/musicbrainz/release-years.json` lezen (leeg bij een kapot bestand) en atomair schrijven
- [x] `scripts/library/fetch-release-years.ts` + `npm run library:release-years` (`--playlist`, `--refresh`, `--limit`); een netwerkfout wordt overgeslagen, niet als "niet gevonden" bewaard
- [x] Maple Classic-pagina en `planReleaseYears`: het vroegste van MusicBrainz, Trackregister en albumjaar; gevulde bibliotheekjaren blijven staan
- [x] README: het script, de map `data/musicbrainz/` (niet in git) en de limiet

### TEST

- [x] `releaseYear.test.ts`, `cacheStore.test.ts`, en uitbreidingen van `releaseYears.test.ts` en `playlistTable.test.ts`
- [x] `vitest run` (844 groen), `tsc --noEmit`, `eslint`
- [ ] Volledige run op Maple Classic tegen het echte MusicBrainz
- [ ] Review van de code (Victor)
- [ ] Dave bekijkt de pagina (zichtbaar resultaat, dus geen merge zonder zijn woord)

### DEPLOY: feat/45-musicbrainz-release-year

Nieuw script `npm run library:release-years` zoekt bij MusicBrainz het jaar op waarin een nummer voor
het eerst uitkwam, met hooguit 1 verzoek per seconde, en bewaart dat lokaal in
`data/musicbrainz/release-years.json` (niet in git). De Maple Classic-pagina toont nu het vroegste
jaar van MusicBrainz, het Trackregister en het album, zodat een nummer op een verzamelalbum of
heruitgave niet meer het jaar van die uitgave krijgt. Nog lege jaren in de bibliotheek worden bij een
sync ook uit die cache gevuld.

**Score:** 3

#### What makes this deploy extra special

Op de Maple Classic-pagina kloppen de jaren van nummers op verzamelalbums en heruitgaven, zoals *I'm a
Believer* op *The Best of The Monkees*: 1967 in plaats van 2008.

**Score:** 3

#### Pull Request

Jaar van eerste uitgave via MusicBrainz, lokaal bewaard
