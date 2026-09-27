## feat/album-candidates-dropdown

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
> For tier 2 audiences: the subscriber of a service. That reader and nobody else -- what matters only
> inside this repo belongs under the first `**Score:**`. If the change reaches that reader
> not at all, N/A is a complete answer and the common one. **One hop and no further:** where that
> reader is itself a business, ITS own customers sit one hop past this repo and are never the reader
> here -- they take nothing this repo ships. Name the party that runs the upgrade, and score
> against them.
>
> The phase arc, the marks and the whole form: `DEVELOPMENT-portable.md`, which ships
> with this workflow.

### PLAN

Dave: "zet in dkj_album ook een dropdownmenu als de track in 2 playlists voorkomt waarbij er verschil
zit". Het register is alleen-lezen, dus het menu toont de kandidaten, net als bij playlists en groepen.
Heeft een track al een (zelf gekozen) `dkj_album`, dan blijft het gewoon dat label.

### CREATE

- [x] `albumsOfPlaylists()` in `albumFromPlaylists.ts`: alle albums die de playlists noemen; `albumFromPlaylists()` gebruikt hem
- [x] `RegisterRow.albumCandidates` in `register.ts`
- [x] `Album`-cel in `TrackRegister.tsx`: label, of menu "N albums" bij twee of meer kandidaten

### TEST

- [x] Unit-test `albumsOfPlaylists`, component-test voor het menu; vitest (771), typecheck en eslint groen
- [~] Visuele controle in de browser -- dat is Daves eigen blik vóór de merge (zichtbaar resultaat)

### DEPLOY: feat/album-candidates-dropdown

Staat `dkj_album` in het Trackregister leeg omdat de playlists van een track verschillende albums
noemen, dan toont de cel nu een menu "N albums" met die kandidaten, elk met zijn kleurstaal -- net als
de menu's bij playlists en groepen. Zoek je op een albumnaam, dan staat die treffer op de knop. Een
track met een ingevuld album toont gewoon dat album.

**Score:** 2

#### What makes this deploy extra special

N/A -- de Trackregister is een intern beheerscherm; geen abonnee ziet het.

**Score:** N/A

#### Pull Request

dkj_album toont een menu met de kandidaat-albums als de playlists verschillen

