## feat/dkj-rating-field

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

Dave (29 september 2026): een nieuw dataveld `dkj_rating`, als kolom in het trackregister. Het type
stond niet in de vraag; gekozen is een geheel getal van 1 (laag) tot 5 (hoog), zelf in te vullen en
niet afgeleid. Een ander type later kost geen data: een typewissel in `fields.ts` laat de kolom staan.
Daarna (zelfde dag, vóór de visuele check): verberg de kolom `djcylow_mix`. Die komt op deze branch mee,
zodat beide wijzigingen aan dezelfde tabel in één blik te beoordelen zijn.
Daarna (Dave): de waardering gaat van 1 tot 8 als acht opties, `star-1` tot `star-8`, en elke track
krijgt standaard `star-4`. Het veld wordt daarom tekst met options; de standaard wordt gezet zolang het
veld leeg is, net als de afgeleide velden, zodat een zelf gekozen waardering blijft staan.
Daarna (Dave): `dkj_rating` wordt het eerste veld dat je in de frontend zelf aanpast en opslaat -- eerst
gevraagd als dropdown, direct daarna bijgesteld naar een potloodje achter de waarde: klik erop, de acht
stars verschijnen, een klik maakt het de nieuwe waarde en slaat hem meteen op.
Daarna (Dave): "ik had niet verwacht dat het via een branch zou moeten". De app schrijft de export, die
in git staat, en direct op main mag niet. Dave koos uit drie routes voor één commando dat de export via
een eigen chore/-branch zelf op main zet. Hier gebouwd, omdat het bij "velden in de app bewerken" hoort
en de checkout voor de visuele check op deze branch moet blijven. Daves eigen `star-3` op
AAR01-HAR04-01 zit bewust NIET in deze branch: die gaat na de merge met `library:publish` naar main.

### CREATE

- [x] `fields.ts`: veld `dkj_rating` (tekst, options `star-1` t/m `star-8`), `RATING_KEY`, `DEFAULT_RATING`
- [x] `fillDefaultRatings` (artistIds.ts) in `applyLibraryIdsFromSnapshot`: `star-4` zolang leeg; gemeld door `library:assign-ids`
- [x] `register.ts`: `rating` in de rij, in het zoeken en als sorteerkolom
- [x] `TrackRegister.tsx`: kolom `dkj_rating` (6%, als label) na `dkj_genre`
- [x] `djcylow_mix` naar de verborgen kolommen (switch); vrijgekomen ruimte naar `dkj_title` (25%) en `spotify_playlist` (19%)
- [x] `rating.ts` (`setTrackRating`: alleen bestaande tracks, alleen de options) en `POST /api/spotify/rating` (same-origin-guard, via `withLibrary`, dus de export meteen bij)
- [x] `Rating`-cel in `TrackRegister.tsx`: potloodje opent het bestaande `Dropdown`-menu (nu met een sluit-callback), optimistisch, bij een fout terug met de reden in de tooltip; opslaan in `saveRating.ts`
- [x] `npm run library:publish` (`scripts/library/publish-library.ps1`): weigert buiten main of bij andere wijzigingen dan de export; branch, ingevuld branchdocument, commit, `open-pr` en `ship-pr` van de dkj-policy-installatie van deze checkout (nieuwste van project- en user-record); `-DryRun`
- [x] `exportDiff.ts` + `scripts/library/export-diff.ts`: de samenvatting voor het changelog-item
- [x] `sameOrigin.ts`-kop noemde "de drie" routes; nu alle acht
- [x] Export bijgewerkt: alle 11.639 tracks `"dkj_rating":"star-4"`; README-sectie
- [ ] Visuele check door Dave op `/spotify/trackregister`

### TEST

- [x] `register.test.ts`, `TrackRegister.test.tsx`, `trackStore.test.ts` (options) en `artistIds.test.ts` (standaard) uitgebreid, nieuw `rating.test.ts`, en de potloodflow (opslaan, en terugzetten bij een fout) in `TrackRegister.test.tsx`; `npm test` (889), typecheck en lint groen
- [x] `exportDiff.test.ts`; `npm test` (892), typecheck en lint groen
- [x] `library:publish`: weigert op deze feature-branch; in een tijdelijke worktree van main -DryRun groen en weigert een los bestand; plugin-lookup en het invullen van een echte scaffold apart getest. Het echte schip (PR + merge) is nog niet gedraaid, omdat dat pas na deze merge vanaf main kan
- [x] Route tegen de dev-server: onbekende track 404, `star-9` 400, andere origin 403; data ongewijzigd

### DEPLOY: feat/dkj-rating-field

Nieuw veld `dkj_rating`: je eigen waardering van een nummer, van `star-1` (laag) tot `star-8` (hoog);
een andere waarde breekt de import af. Elke track krijgt standaard `star-4`: bij elke sync en bij
`npm run library:assign-ids` wordt het gezet zolang het leeg is, dus een zelf gekozen waardering blijft
staan. De export is meteen gevuld: alle 11.639 tracks staan op `star-4`. Het trackregister toont het als
kolom `dkj_rating` na `dkj_genre`, en je kunt erop sorteren en zoeken. Het is het eerste veld dat je in
de frontend zelf wijzigt: klik op het potloodje achter de waarde, kies een star, en hij wordt meteen
opgeslagen in de database en de export (`POST /api/spotify/rating`); mislukt dat, dan komt de vorige
waarde terug met de reden in de tooltip. Zulke wijzigingen zet `npm run library:publish` in één keer op
main: het maakt een eigen branch voor alleen de export, vult het changelog-item met wat er veranderde, en
draait de PR, de merge en de fold. Daarnaast staat `djcylow_mix` niet meer in de gewone tabel maar bij de verborgen kolommen
(achter de switch); zoeken op de mixnamen blijft werken.

**Score:** 3

#### What makes this deploy extra special

Je kunt voor het eerst zelf iets in de bibliotheek aanpassen: je waardering van elk nummer, met één klik
op het potloodje in het trackregister, meteen opgeslagen. Je kunt erop sorteren, en de mixkolom staat
niet meer in de weg: die zit nu achter de switch.

**Score:** 4

#### Pull Request

Trackregister krijgt een bewerkbare dkj_rating (star-1 t/m star-8) en verbergt djcylow_mix

