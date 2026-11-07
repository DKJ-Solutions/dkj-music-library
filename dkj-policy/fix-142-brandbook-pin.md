## fix/142-brandbook-pin

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

### CREATE

- [x] `house-style.css` en `house-theme.js` vervangen door de v6.9.0-kopieën (sha256 gelijk aan de pin-tabel van de dkj-brandbook-skill; geen netwerk-, eval- of cookiecode)
- [x] `house-product.css` (v6.9.0, sha256 gelijk) gevendord naast de kern (met `-text` in `.gitattributes`, zoals de andere twee) en in `src/app/layout.tsx` na `house-style.css` geladen: de site-header en de breadcrumb-balk staan sinds DKJ-Solutions/dkj-marketplace#3831 in de productlaag
- [x] Vervallen tokens hernoemd in de eigen laag (12 bestanden in `src/styles/`), volgens de hernoemtabellen van de brand book-README: `--muted` naar `--primary-muted`, `--paper-1..4` naar `--bg-1..4`, `--radius-lg` naar `--radius-3`
- [x] `check-house-style`: geen `pin`-, `redefine`- of `retired`-bevinding meer. De 116 `type`- en 11 `colour`-bevindingen van de nieuwere regels staan in #148, de `.eyebrow`-labels zonder huisstijl in #149

### TEST

- [ ] Owner bekijkt de app in de nieuwe huisstijl (http://localhost:3000/, /spotify, /mixen, /compare)

### DEPLOY: fix/142-brandbook-pin

De app draait op de brand book-kopieën van dkj-policy v6.9.0: `house-style.css` en `house-theme.js` vervangen, en
`house-product.css` erbij, dat sinds die release de site-header en de breadcrumb-balk draagt. De eigen laag leest de
nieuwe tokennamen (`--primary-muted`, `--bg-1..4`, `--radius-3`) in plaats van de vervallen namen. De pin-bevindingen
van de `house-style`-check zijn daarmee weg.

**Score:** 2

#### What makes this deploy extra special

De vervallen tokennamen zouden bij een volgende brand book-release stil hun kleur verliezen; nu leest de eigen laag de
namen die de huisstijl definieert.

**Score:** 1

#### Pull Request

Brand book-kopieën naar v6.9.0, met house-product.css en de nieuwe tokennamen

