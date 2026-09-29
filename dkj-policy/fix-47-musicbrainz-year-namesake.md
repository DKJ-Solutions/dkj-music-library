## fix/47-musicbrainz-year-namesake

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

Gemeten tegen MusicBrainz (29 september 2026, dezelfde zoekopdracht als het script, limit 100, score >= 90):

- James Morrison, *Wonderful World*: 22 treffers van artiest `88a8d8a9` (vroegste 2006), 2 van een
  naamgenoot `b49a9595` (vroegste 1996). Een MBID-pin herstelt dit.
- Lily Allen *Smile* (1995), Status Quo *Whatever You Want* (1977), Sérgio Mendes *Mas Que Nada* (1985):
  alle treffers van één en dezelfde artiest, dus de uitschieter zit in MusicBrainz' eigen data. Een
  strengere match helpt hier niet, dus is er een handmatige overschrijving nodig.
- Randy Bachman, *You Ain't Seen Nothin' Yet*: MusicBrainz credit geen enkele Bachman-opname met 1974.
  Of de Spotify-track (*Anthology*, 2014) de BTO-opname is, heb ik niet kunnen nagaan. Die track krijgt
  dus geen overschrijving, want dan zou ik een jaar raden.

#### Aanpak

Beide richtingen uit het issue. Een overschrijving doet niet mee in het minimum maar wint, anders
verliest hij van precies dat te vroege jaar.

### CREATE

- [x] `src/lib/musicbrainz/releaseYearOverrides.ts`: vastgezette jaren per Spotify-track-id (Smile 2006,
  Whatever You Want 1979, Mas Que Nada 2006)
- [x] `playlistTableRows.ts` en `releaseYears.ts` (`planReleaseYears`): een vastgezet jaar wint van het minimum
- [x] `chooseRelease()`: de artiest-MBID van de hoogste score vastzetten, en een naamgenoot telt niet mee

### TEST

- [x] Regressietests: naamgenoot, samenwerking plus kandidaat zonder MBID, vastgezet jaar op de rij en in het register-plan
- [x] Het register (`data/library/export`) heeft voor de gekoppelde tracks al het juiste jaar (Status Quo
  1979, Mas Que Nada 2006), dus er hoeft geen data mee te veranderen

### DEPLOY: fix/47-musicbrainz-year-namesake

Een te vroeg MusicBrainz-jaar trekt het jaar op de Maple Classic- en Classic Pop-pagina niet meer terug.
Opnames van een andere artiest met dezelfde naam tellen niet meer mee, want `chooseRelease()` zet de
artiest (MBID) van de beste treffer vast. Voor de gevallen waarin MusicBrainz zelf een verkeerd jaar
heeft, is er een vaste lijst, `src/lib/musicbrainz/releaseYearOverrides.ts`: een jaar daarin wint van
alle andere bronnen. De lijst begint met *Smile* (2006), *Whatever You Want* (1979) en *Mas Que Nada*
(2006). *Wonderful World* van James Morrison komt pas goed na
`npm run library:release-years -- --refresh`, omdat de cache het oude jaar nog bewaart.
Bij *You Ain't Seen Nothin' Yet* (Randy Bachman) is niet na te gaan welke opname het is, dus die houdt
1993. Resolves #47.

**Score:** 2

#### What makes this deploy extra special

De gebruiker van de app ziet op de playlist-pagina's niet langer een jaar dat tien jaar te vroeg is voor
een bekend nummer, en kan zo'n geval voortaan vastzetten met één regel.

**Score:** 2

#### Pull Request

MusicBrainz-jaar: naamgenoot en uitschieters
