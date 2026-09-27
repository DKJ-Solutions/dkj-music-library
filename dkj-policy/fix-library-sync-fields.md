## fix/library-sync-fields

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

Gevonden bij het bouwen van de playlist-labels (#19): `dkj_playlists` stond in de export, maar bij alle
12.471 tracks leeg in de database, terwijl de hash in `library_meta` precies gelijk was aan die van de
export. Een restore neemt alleen velden over die in `fields.ts` staan; draaide die met een oudere
veldenlijst (vrijwel zeker de draaiende dev-server tijdens het mergen), dan valt een veld weg en noteert
hij toch "gelijk". Zonder iets in de hash dat de velden beschrijft, herstelt dat zich nooit vanzelf --
op elke machine na een `git pull` met een nieuw veld.

### CREATE

- [x] `syncStamp()` in `libraryFile.ts`: `library_meta` onthoudt de exporthash plus een vingerafdruk van de veldenlijst; een andere veldenlijst leidt tot een nieuwe restore
- [x] Bestaande databases hebben de oude vorm en bouwen zich bij de eerste opening één keer opnieuw op (de export is de bron, dus dat is veilig)

### TEST

- [x] typecheck, eslint en vitest groen, met een test die een restore met een oudere veldenlijst naspeelt
- [x] Echte database: `library:sync` bouwde opnieuw op, `dkj_playlists` weer bij 12.471 tracks gevuld; tweede run "gelijk"

### DEPLOY: fix/library-sync-fields

#### What does the change on this branch deploy to main?

##### Tier 0

De bibliotheek bouwt zich nu opnieuw op uit de export als hij eerder met een andere veldenlijst gelezen
werd. Daarvoor kon een nieuw veld na een `git pull` voorgoed leeg blijven in de database, terwijl de
export het wel had: zo was `dkj_playlists` bij alle 12.471 tracks leeg. Elke bestaande database bouwt
zich bij de eerste opening één keer opnieuw op.

**Score:** 3

<!--
     Is this change also relevant to management and the employer/commissioner? Then continue to Tier 1.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 1

Intern; management merkt hier niets van.

**Score:** N/A

<!--
     Is this change also relevant to a subscriber of the service? Then continue to Tier 2.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

De bibliotheek bouwt zich opnieuw op als de veldenlijst veranderd is

