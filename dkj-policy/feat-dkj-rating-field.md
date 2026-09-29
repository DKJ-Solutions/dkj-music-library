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

### CREATE

- [x] `fields.ts`: veld `dkj_rating` (integer) en `RATING_KEY`
- [x] `register.ts`: `rating` in de rij, in het zoeken en als sorteerkolom
- [x] `TrackRegister.tsx`: kolom `dkj_rating` (4%) na `dkj_genre`; `dkj_title` van 21% naar 17%
- [x] `djcylow_mix` naar de verborgen kolommen (switch); vrijgekomen ruimte naar `dkj_title` (25%) en `spotify_playlist` (19%)
- [x] Export bijgewerkt: elke track `"dkj_rating":null`, verder byte-gelijk (gecontroleerd); README-sectie
- [ ] Visuele check door Dave op `/spotify/trackregister`

### TEST

- [x] `register.test.ts` en `TrackRegister.test.tsx` uitgebreid; `npm test` (882), typecheck en lint groen

### DEPLOY: feat/dkj-rating-field

Nieuw veld `dkj_rating`: je eigen waardering van een nummer, een geheel getal van 1 (laag) tot 5
(hoog). Je vult het zelf in; het wordt niet afgeleid, dus in de export staat het eerst bij elke track op
`null`. Het trackregister toont het als kolom `dkj_rating` na `dkj_genre`, en je kunt erop sorteren en
zoeken. Daarnaast staat `djcylow_mix` niet meer in de gewone tabel maar bij de verborgen kolommen
(achter de switch); zoeken op de mixnamen blijft werken.

**Score:** 2

#### What makes this deploy extra special

Het trackregister heeft een kolom voor je eigen waardering, waarop je kunt sorteren, en de mixkolom staat
niet meer in de weg: die zit nu achter de switch.

**Score:** 2

#### Pull Request

Trackregister krijgt dkj_rating (1-5) en verbergt djcylow_mix

