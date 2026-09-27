# Changelog

## [Unreleased]

**3 patch entries** <!-- pending-tally -->

### DEPLOY: feat/distinct-artist-count · 20260927-075152Z

#### What does the change on this branch deploy to main?

##### Tier 0

De Spotify-mirror toont nu hoeveel verschillende artiesten er in de bibliotheek zitten: als stat-tegel
naast het aantal playlists op `/spotify`, en boven de top-artiesten op het dashboard. Er wordt geteld op
Spotify-artist-id, over alle playlists, met featured artiesten inbegrepen. De telling zit in een nieuwe
pure functie `countDistinctArtists` (`src/lib/spotify/dashboardStats.ts`). `/spotify` leest de snapshot
nu zelf in en geeft hem door aan `getEnrichedSnapshot()`, omdat de verrijkte playlists geen tracks meer
bevatten. De snapshot wordt nog steeds maar één keer gelezen.

**Score:** 2

##### Tier 1

Een lokale, persoonlijke tool: er is geen management of opdrachtgever die hier iets aan heeft.

**Score:** N/A

##### Tier 2

De app heeft geen abonnees: hij draait alleen op de eigen machine.

**Score:** N/A

#### Pull Request

Show the number of distinct artists on /spotify and the dashboard

[PR #4](https://github.com/DKJ-Solutions/dkj-music-library/pull/4)

---

### DEPLOY: chore/commit-settings-statusline · 20260927-073240Z

#### What does the change on this branch deploy to main?

##### Tier 0

The repo's Claude Code settings are now versioned: the enabled plugins, the workflow's allow rules and
the deny rules for force-push, hard reset, rebase and `rm -rf`. The statusline draws a progress bar for
the long background runs (test gate, ship-pr waiting on CI).

**Score:** 3

##### Tier 1

N/A -- developer tooling only.

**Score:** N/A

##### Tier 2

N/A -- no app behaviour changes.

**Score:** N/A

#### Pull Request

Commit the Claude Code settings and wire up the progress statusline

[PR #3](https://github.com/DKJ-Solutions/dkj-music-library/pull/3)

---

### DEPLOY: chore/adopt-dkj-workflow · 20260927-071710Z

#### What does the change on this branch deploy to main?

##### Tier 0

The repo now runs the shared specialist team and the dkj-policy branch/PR/fold workflow: every PR
carries a branch document, is gated in CI, and is folded into `dkj-policy/CHANGELOG.md` at the merge. `lint-en-tests` is now a required check on
`main`, and the one test that failed only on Linux CI (the mix-dir override path) is fixed.

**Score:** 4

##### Tier 1

N/A -- workflow tooling only; nothing management or a commissioner sees changes.

**Score:** N/A

##### Tier 2

N/A -- no user-facing behaviour of the app changes.

**Score:** N/A

#### Pull Request

Adopt the dkj specialists and dkj-policy workflow

[PR #2](https://github.com/DKJ-Solutions/dkj-music-library/pull/2)

---

