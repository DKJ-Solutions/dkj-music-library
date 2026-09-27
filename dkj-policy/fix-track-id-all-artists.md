## fix/track-id-all-artists

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
> The phase arc, the marks and the whole form: `DEVELOPMENT-portable.md`, which ships
> with this workflow.

### PLAN

#### Keuze van de eigenaar (27 september 2026)

PR #11 bouwde `<dkj_artist_id van de hoofdartiest>-<NN>`. De eigenaar verduidelijkte daarna dat alle
artiest-ID's erin horen, met een streepje ertussen: `<dkj_artist_id[1]>-<dkj_artist_id[2]>-...-<NN>`. Het
volgnummer telt per artiestencombinatie. Gemeten vóór de bouw: 7.125 combinaties, één boven de 99
(Immediate, 143), mediaan 13 tekens, 95% ≤ 18, langste 78 tekens (15 artiesten).

#### Eenmalige omzetting van de echte bibliotheek

Uitgevoerd met `renumberTrackIds()`, met het predicaat "meer dan één artiest en een ID in het formaat
`<hoofdartiest>-NN`", via een script dat bewust niet in de repo staat. Het mag niet nog eens draaien: na
de omzetting zou het een ID raken waarvan de eigenaar `dkj_artist_ids` later zelf heeft uitgebreid. Er
werden 4.692 tracks omgezet, precies het aantal nummers met meer dan één artiest.

### CREATE

- [x] `trackIds.ts`: `artistPart()` = alle eigen artiest-ID's met streepjes; nieuwe nummers en omnummering tellen per combinatie
- [x] `renumberTrackIds(db, isStale)`: generieke omnummering in de volgorde van het oude ID; `renumberLegacyTrackIds()` gebruikt hem voor T-ID's
- [x] README: formaat met alle artiesten
- [x] Echte bibliotheek omgezet (zie hierboven)

### TEST

- [x] Tests bijgewerkt voor het nieuwe formaat, plus `renumberTrackIds` met het predicaat van het tussenformaat (volgorde van het oude ID, nummers met één artiest ongemoeid, tweede keer niets)
- [x] Vitest 694/694, `tsc --noEmit` en `eslint` schoon
- [x] Review Victor: geen bevindingen (buckets met streepjes, oldOrder, botsingen, automatische T-omnummering); verband tussen `artistPart()` en `dkj_artist_ids` als commentaar vastgelegd
- [x] Echte data: alle 12.471 ID's = alle artiesten + volgnummer, alle uniek, 0 koppelingen naar een onbekend ID; verse database uit de export opgebouwd; `library:assign-ids` daarna doet niets

### DEPLOY: fix/track-id-all-artists

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_track_id` bevat nu de ID's van alle artiesten van een nummer, in volgorde en met een streepje ertussen,
en daarachter een volgnummer per artiestencombinatie. Cobra Dance van Billy Esteban en Cafe De Anatolia is
`BIL09-CAF01-03`. Nummers met één artiest hebben hetzelfde ID als eerst (Firestarter blijft `PRO02-21`).
De 4.692 nummers met meer dan één artiest zijn één keer omgenummerd, ook in de koppeltabel.

**Score:** 3

<!--
     Is this change also relevant to management and the employer/commissioner? Then continue to Tier 1.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 1

Een persoonlijke tool zonder opdrachtgever; niemand buiten de ontwikkelaar merkt dit.

**Score:** N/A

<!--
     Is this change also relevant to a subscriber of the service? Then continue to Tier 2.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 2

Er is geen dienst met abonnees.

**Score:** N/A

#### Pull Request

dkj_track_id carries every artist ID in order, not just the main artist's (MAR01BRU01-01)

