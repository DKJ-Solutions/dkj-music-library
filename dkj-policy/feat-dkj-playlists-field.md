## feat/dkj-playlists-field

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

Dave wil in het Trackregister per track een link naar de Spotify-playlist, als label met de naam. 5.031
van de 12.471 tracks staan in meer dan één playlist (tot 12); gekozen: een label per playlist. De
playlists komen uit de snapshot, en die staat niet in git; om het register op elke machine te laten
werken, komen ze als veld in de bibliotheek. De repo is publiek en `private-rules.json` houdt namen van
mensen en gelegenheden juist buiten git; Dave koos er bewust voor alle playlistnamen in de export te
zetten, ook die uit de wereld Privé.

### CREATE

- [x] `playlistLinks.ts`: per track de playlists `{ id, name }` in snapshot-volgorde, zonder dubbelen; bij elke sync ververst, alleen wat verandert
- [x] `dkj_playlists` in `fields.ts`, aangesloten op `applyLibraryIdsFromSnapshot`
- [x] Alle 12.471 tracks gevuld uit de snapshot (`npm run library:assign-ids`)
- [x] README, met de waarschuwing dat de namen publiek zijn

### TEST

- [x] typecheck, eslint en vitest groen, met `playlistLinks.test.ts`
- [x] Tweede run van `library:assign-ids` verandert niets

### DEPLOY: feat/dkj-playlists-field

#### What does the change on this branch deploy to main?

##### Tier 0

Elke track krijgt `dkj_playlists`: de Spotify-playlists waarin hij staat, met ID en naam. Het veld
wordt bij elke sync ververst, en staat in de export in git, dus het register kan de playlists op elke
machine als link tonen. De playlistnamen zijn daarmee publiek, ook die uit de wereld Privé; daar is
bewust voor gekozen.

**Score:** 3

<!--
     Is this change also relevant to management and the employer/commissioner? Then continue to Tier 1.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

<!--
     Is this change also relevant to a subscriber of the service? Then continue to Tier 2.
     If not, say so there in one line and put N/A in its Score.
-->

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

Trackregister krijgt de kolom dkj_playlists (de playlists waarin een track staat)

