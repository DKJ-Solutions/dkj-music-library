# Changelog

## [Unreleased]

**7 patch entries** <!-- pending-tally -->

### DEPLOY: feat/artist-ids · 20260927-152121Z

#### What does the change on this branch deploy to main?

##### Tier 0

Elke Spotify-artiest krijgt een eigen ID van drie letters plus een nummer (The Prodigy wordt `PRO02`,
Amy Winehouse `AMY01`). De letters zijn de eerste drie van de naam, zonder lidwoord en zonder accenten;
het nummer is het laagste dat nog vrij is en groeit voorbij 99 door als dat nodig is. De ID's staan in de
nieuwe tabel `artists` en in de export als `artists.ndjson`. Elke track heeft nu `dkj_artist_ids`, met de
hoofdartiest eerst. Dat gebeurt na elke sync op `/spotify` en met `npm run library:assign-ids`.

**Score:** 3

##### Tier 1

Een persoonlijke tool zonder opdrachtgever; niemand buiten de ontwikkelaar merkt dit.

**Score:** N/A

##### Tier 2

Er is geen dienst met abonnees.

**Score:** N/A

#### Pull Request

Every Spotify artist gets its own ID: three letters of the name plus a number (PRO01)

[PR #9](https://github.com/DKJ-Solutions/dkj-music-library/pull/9)

---

### DEPLOY: feat/library-export · 20260927-150712Z

#### What does the change on this branch deploy to main?

##### Tier 0

De trackbibliotheek reist nu met de repo mee. `data/library/export/` bevat elk nummer met zijn eigen ID en
alle velden als gesorteerde NDJSON, en elke kloon bouwt zijn lokale `library.db` daar vanzelf uit op. Elke
schrijvende stap (de sync op `/spotify`, `library:import`, `library:assign-ids`) werkt de export
direct bij. Een `git pull` met een nieuwere export wordt bij de volgende opening overgenomen. Met
`npm run library:sync` trek je database en export met de hand gelijk.

**Score:** 4

##### Tier 1

Een persoonlijke tool zonder opdrachtgever; niemand buiten de ontwikkelaar merkt dit.

**Score:** N/A

##### Tier 2

Er is geen dienst met abonnees.

**Score:** N/A

#### Pull Request

Track library travels with the repo as a text export and rebuilds itself on a fresh clone

[PR #8](https://github.com/DKJ-Solutions/dkj-music-library/pull/8)

---

### DEPLOY: feat/track-ids · 20260927-093930Z

#### What does the change on this branch deploy to main?

##### Tier 0

Elk nummer uit de Spotify-snapshot krijgt een eigen, oplopend ID (`T000001`) in de trackdatabase.
Releasevarianten met dezelfde titel en precies dezelfde artiesten krijgen hetzelfde ID. De nieuwe
koppeltabel `spotify_track_ids` houdt de ID's stabiel over syncs heen: een nieuwe variant van een bekend
nummer krijgt het bestaande ID, en alleen een echt nieuw nummer krijgt het volgende vrije nummer. Een
nieuw nummer wordt aangemaakt met titel, artiesten, album en duur van Spotify. Bestaande rijen worden
daarna nooit meer overschreven. Dit gebeurt na elke sync op `/spotify`, en los via
`npm run library:assign-ids`. Op de huidige snapshot levert dat 12.471 nummers op, uit 13.140
Spotify-ID's.

**Score:** 3

##### Tier 1

Een lokale, persoonlijke tool: er is geen management of opdrachtgever die hier iets aan heeft.

**Score:** N/A

##### Tier 2

De app heeft geen abonnees: hij draait alleen op de eigen machine.

**Score:** N/A

#### Pull Request

Give every Spotify track its own ID (T000001), one per song

[PR #7](https://github.com/DKJ-Solutions/dkj-music-library/pull/7)

---

### DEPLOY: feature/track-library-db · 20260927-075255Z

#### What does the change on this branch deploy to main?

##### Tier 0

The app now has a local track database. The collection of about 6000 tracks (your own track ID plus the
Spotify metadata) goes into one SQLite file with `npm run library:import`, from a CSV or JSON file. A
new data field is one line in `src/lib/library/fields.ts`, and the database adds the column itself.
Removing a field never deletes data.

**Score:** 4

##### Tier 1

Not relevant: the app is local and has no subscribers.

**Score:** N/A

##### Tier 2

Not relevant: see Tier 1.

**Score:** N/A

#### Pull Request

Trackdatabase voor de muziekcollectie

[PR #5](https://github.com/DKJ-Solutions/dkj-music-library/pull/5)

---

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

