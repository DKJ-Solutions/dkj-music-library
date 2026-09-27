# Changelog

## [Unreleased]

**20 patch entries** <!-- pending-tally -->

### DEPLOY: feat/dkj-bpm-from-playlists · 20260927-183838Z

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_bpm` wordt nu uit de Spotify-playlists afgeleid: een BPM in de playlistnaam (`128BPM EDM`), House
Mix is 128, Drum & Bass en D&B/DNB zijn 176. Noemen de playlists verschillende BPM's, dan wint de meest
genoemde; bij een gelijke stand blijft het leeg. 7.454 van de 12.471 tracks hebben zo hun BPM gekregen;
de sync doet het voortaan bij elke nieuwe track.

**Score:** 4

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

dkj_bpm wordt afgeleid uit de playlists

[PR #23](https://github.com/DKJ-Solutions/dkj-music-library/pull/23)

---

### DEPLOY: feat/rename-spotify-playlist · 20260927-183106Z

#### What does the change on this branch deploy to main?

##### Tier 0

Het veld met de Spotify-playlists van een track heet nu `spotify_playlist` in plaats van `dkj_playlists`.
Een bestaande database hernoemt de kolom zelf, en een export met de oude naam zet nog gewoon terug; dat
laatste geldt voortaan voor elk hernoemd veld.

**Score:** 2

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

dkj_playlists heet voortaan spotify_playlist

[PR #22](https://github.com/DKJ-Solutions/dkj-music-library/pull/22)

---

### DEPLOY: feat/dkj-album-from-playlists · 20260927-182815Z

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_album` wordt nu uit de Spotify-playlists afgeleid: noemen alle playlists van een track hetzelfde
album (`Magenta Light (m) ♦️ 128BPM EDM` → Magenta Light (m)), dan krijgt de track dat album. Noemen ze
verschillende albums, of geen, dan blijft het leeg om zelf te kiezen. 8.257 van de 12.471 tracks hebben
zo hun album gekregen; de sync doet het voortaan bij elke nieuwe track.

**Score:** 4

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

dkj_album wordt afgeleid uit de playlists, als dat eenduidig is

[PR #21](https://github.com/DKJ-Solutions/dkj-music-library/pull/21)

---

### DEPLOY: fix/library-sync-fields · 20260927-180523Z

#### What does the change on this branch deploy to main?

##### Tier 0

De bibliotheek bouwt zich nu opnieuw op uit de export als hij eerder met een andere veldenlijst gelezen
werd. Daarvoor kon een nieuw veld na een `git pull` voorgoed leeg blijven in de database, terwijl de
export het wel had: zo was `dkj_playlists` bij alle 12.471 tracks leeg. Elke bestaande database bouwt
zich bij de eerste opening één keer opnieuw op.

**Score:** 3

##### Tier 1

Intern; management merkt hier niets van.

**Score:** N/A

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

De bibliotheek bouwt zich opnieuw op als de veldenlijst veranderd is

[PR #20](https://github.com/DKJ-Solutions/dkj-music-library/pull/20)

---

### DEPLOY: feat/dkj-playlists-field · 20260927-175945Z

#### What does the change on this branch deploy to main?

##### Tier 0

Elke track krijgt `dkj_playlists`: de Spotify-playlists waarin hij staat, met ID en naam. Het veld
wordt bij elke sync ververst, en staat in de export in git, dus het register kan de playlists op elke
machine als link tonen. De playlistnamen zijn daarmee publiek, ook die uit de wereld Privé; daar is
bewust voor gekozen.

**Score:** 3

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

Trackregister krijgt de kolom dkj_playlists (de playlists waarin een track staat)

[PR #19](https://github.com/DKJ-Solutions/dkj-music-library/pull/19)

---

### DEPLOY: feat/dkj-file-field · 20260927-174510Z

#### What does the change on this branch deploy to main?

##### Tier 0

Het Trackregister krijgt de kolom `dkj_file`: de bestandsnaam zoals op de desktop, zonder extensie.
`Higher - David Penn Remix` van Abel Ramos en David Penn wordt `Abel Ramos - Higher (David Penn Remix)`.
Remixers en featurings staan alleen in de titel, niet nog eens bij de artiesten; elk stuk na ` - ` komt
tussen haakjes, en tekens die Windows weigert, gaan eruit. Alle 12.471 tracks zijn gevuld.

**Score:** 3

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

Trackregister krijgt de kolom dkj_file (de bestandsnaam zoals op de desktop)

[PR #18](https://github.com/DKJ-Solutions/dkj-music-library/pull/18)

---

### DEPLOY: feat/dkj-artist-title-credit · 20260927-173538Z

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_artist` neemt nu ook een remixer die alleen in de titel staat: `The Wolves - Lenzman Remix` →
Lenzman, `Good Times - Martin Sharp Remix` → Martin Sharp. Een stijl leest daarbij als naam (`Techno
Mix` → Techno), zoals gekozen; jaartallen, plaatformaten en woorden als `Radio` of `Original` tellen niet.
Bij 209 bestaande tracks is `dkj_artist` daarmee veranderd.

**Score:** 2

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

dkj_artist: ook een remixer die alleen in de titel staat gaat voor

[PR #17](https://github.com/DKJ-Solutions/dkj-music-library/pull/17)

---

### DEPLOY: feat/dkj-artist-remixer · 20260927-172858Z

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_artist` volgt nu Dave's regel: de artiest die de remix of edit maakte, gaat voor. Staat een van de
artiesten van de track in het versiedeel van de titel (`Filmic - CRi Remix`, `Falling (JORDAZ Radio
Mix)`), dan is die het; anders blijft het de hoofdartiest. Een naam die alleen in de titel staat en niet
bij de track, telt niet. Bij 1.214 bestaande tracks is `dkj_artist` daarmee veranderd, bijvoorbeeld
`New Rules - Alison Wonderland Remix` → Alison Wonderland.

**Score:** 3

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

dkj_artist: de remixer of editor gaat voor

[PR #16](https://github.com/DKJ-Solutions/dkj-music-library/pull/16)

---

### DEPLOY: feat/dkj-albumartiest-field · 20260927-170519Z

#### What does the change on this branch deploy to main?

##### Tier 0

Het Trackregister krijgt de kolom `dkj_albumartiest`: alle artiesten van een track als één tekst, in de
volgorde van Spotify, met komma's ertussen (`Aaron Smith, Indiblu, JORDAZ`). Nieuwe tracks krijgen hem bij
het aanmaken, bestaande bij elke sync zolang het veld leeg is; wat je zelf invult, blijft staan. Alle
12.471 tracks in de export zijn meteen gevuld.

**Score:** 3

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

Trackregister krijgt de kolom dkj_albumartiest (alle artiesten in Spotify-volgorde)

[PR #14](https://github.com/DKJ-Solutions/dkj-music-library/pull/14)

---

### DEPLOY: feat/dkj-bpm-field · 20260927-170230Z

#### What does the change on this branch deploy to main?

##### Tier 0

Het Trackregister krijgt drie kolommen. `dkj_bpm` en `dkj_album` hebben een vaste lijst keuzes
(`FieldDef.options`, nieuw): `dkj_bpm` kent 128BPM, 112BPM, 176BPM, 144BPM en 96BPM, `dkj_album` de 32
combinaties van acht kleuren (Green, Yellow, Red, Purple, Cyan, Blue, Orange, Magenta) met Light/Full en
(f)/(m), bijvoorbeeld `Green Light (f)`. Een andere waarde breekt de import af; hoofdletters en spaties
tellen niet mee. `dkj_artist` bevat precies één artiest: de eerste uit `artists`. Nieuwe tracks krijgen hem
bij het aanmaken, bestaande bij elke sync zolang het veld leeg is; alle 12.471 tracks in de export zijn
meteen gevuld.

**Score:** 3

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

##### Tier 2

Geen abonnee van een dienst ziet dit.

**Score:** N/A

#### Pull Request

Trackregister krijgt de kolommen dkj_bpm, dkj_album en dkj_artist

[PR #13](https://github.com/DKJ-Solutions/dkj-music-library/pull/13)

---

### DEPLOY: fix/track-id-all-artists · 20260927-160019Z

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_track_id` bevat nu de ID's van alle artiesten van een nummer, in volgorde en met een streepje ertussen,
en daarachter een volgnummer per artiestencombinatie. Cobra Dance van Billy Esteban en Cafe De Anatolia is
`BIL09-CAF01-03`. Nummers met één artiest hebben hetzelfde ID als eerst (Firestarter blijft `PRO02-21`).
De 4.692 nummers met meer dan één artiest zijn één keer omgenummerd, ook in de koppeltabel.

**Score:** 3

##### Tier 1

Een persoonlijke tool zonder opdrachtgever; niemand buiten de ontwikkelaar merkt dit.

**Score:** N/A

##### Tier 2

Er is geen dienst met abonnees.

**Score:** N/A

#### Pull Request

dkj_track_id carries every artist ID in order, not just the main artist's (MAR01BRU01-01)

[PR #12](https://github.com/DKJ-Solutions/dkj-music-library/pull/12)

---

### DEPLOY: feat/track-id-format · 20260927-155129Z

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_track_id` bestaat nu uit het artiest-ID van de hoofdartiest, een streepje en een volgnummer per
artiest: Firestarter van The Prodigy is `PRO02-21`, Rehab van Amy Winehouse `AMY01-01`. Het volgnummer
heeft minstens twee cijfers en groeit na 99 door (`IMM01-143`). De bestaande `T000001`-ID's zijn één keer
omgenummerd, per artiest in hun oude volgorde, en in de koppeltabel mee aangepast. Een nieuw nummer krijgt
bij het aanmaken meteen ook zijn `dkj_artist_ids`.

**Score:** 4

##### Tier 1

Een persoonlijke tool zonder opdrachtgever; niemand buiten de ontwikkelaar merkt dit.

**Score:** N/A

##### Tier 2

Er is geen dienst met abonnees.

**Score:** N/A

#### Pull Request

dkj_track_id becomes <dkj_artist_id>-<NN>, numbered per main artist (PRO02-01)

[PR #11](https://github.com/DKJ-Solutions/dkj-music-library/pull/11)

---

### DEPLOY: refactor/dkj-track-id · 20260927-152759Z

#### What does the change on this branch deploy to main?

##### Tier 0

`track_id` heet nu `dkj_track_id`: in de database, in de export en als kolomkop voor
`npm run library:import`. Er is niets te doen: een bestaande database hernoemt de kolom de eerste keer dat
hij opent, een oude export wordt nog gewoon gelezen, en een importbestand met `track_id` als kolomkop werkt
nog.

**Score:** 2

##### Tier 1

Een persoonlijke tool zonder opdrachtgever; niemand buiten de ontwikkelaar merkt dit.

**Score:** N/A

##### Tier 2

Er is geen dienst met abonnees.

**Score:** N/A

#### Pull Request

track_id becomes dkj_track_id, with a migration for existing databases, exports and import files

[PR #10](https://github.com/DKJ-Solutions/dkj-music-library/pull/10)

---

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

