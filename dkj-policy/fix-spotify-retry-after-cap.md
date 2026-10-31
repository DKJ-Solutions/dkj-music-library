## fix/spotify-retry-after-cap

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

Melding van de eigenaar: slepen in werkbak 5p4okOZaBczCnGduUhfFQd gaf steeds "Er loopt al een
verplaatsing in deze playlist." De serverlog liet zien waarom: Spotify gaf 429 met Retry-After 19429 s,
`spotifyGet` sliep dat uit en de verplaatsing hield het slot (`inFlight`) urenlang vast.

### CREATE

- [x] `SpotifyRateLimitError` (subklasse van `SpotifyApiError`, status 429, met `retryAfterSeconds`)
- [x] `httpClient`: 429-afhandeling van GET en PUT samengebracht in `waitOutRateLimit`, met bovengrens `MAX_RETRY_WAIT_SECONDS` (60 s)
- [x] playlist-order-route: `SpotifyRateLimitError` -> 503 `rate_limited` met het tijdstip waarop het weer kan

### TEST

- [x] httpClient-tests: lange Retry-After gooit meteen (GET en PUT), precies 60 s wordt nog afgewacht
- [x] route-test: 503 bij rate limit en het slot is daarna weer vrij
- [x] vitest (Spotify-tests, 398 groen), `tsc --noEmit`, eslint

### DEPLOY: fix/spotify-retry-after-cap

Spotify-aanroepen wachten een rate limit nog maar tot 60 seconden af. Bij een langere `Retry-After`
(Spotify gaf er een van ruim vijf uur) stopt de aanvraag meteen met een `SpotifyRateLimitError`. Tot nu toe
sliep de aanvraag uren door. Bij het verplaatsen in een werkbak hield ze daarbij het slot van de playlist
vast, zodat elke volgende sleep "Er loopt al een verplaatsing in deze playlist." gaf. Nu meldt de werkbak
dat Spotify even niet laat schrijven, en vanaf hoe laat het weer kan.

**Score:** 3

#### What makes this deploy extra special

Slepen in een werkbak raakt niet meer urenlang op slot na een rate limit van Spotify. De melding zegt
voortaan wat er aan de hand is en vanaf wanneer het weer kan.

**Score:** 3

#### Pull Request

Een lange Spotify Retry-After meteen melden in plaats van uren te wachten

