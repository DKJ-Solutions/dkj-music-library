# dkj-music-library

Een lokale Next.js-app die de muziekbibliotheek spiegelt. Er is geen deploy-doel: hij draait op je eigen
machine.

- **Spotify-mirror** (`/spotify`): een read-only back-up van de Spotify-playlists, met doorzoeken,
  groeperen en filteren, een dashboard, de BPM- en wereld-indeling, en de brug naar de DJ Cylow-mixen.
  Er gaat maar één ding terug naar Spotify, en dat staat in `src/lib/spotify/playlistApi.ts`: de naam
  en beschrijving van een playlist die bij een mix hoort. Verder schrijft de app niets.
- **Desktop-mirror**: moet nog gebouwd worden.

De app kwam op 2026-09-27 uit de private repo `life-hub`, en is daar in zijn geheel weggehaald.

## Starten

```sh
npm install
cp .env.local.example .env.local   # vul SPOTIFY_CLIENT_ID en SPOTIFY_CLIENT_SECRET in
npm run dev
```

Open de app op **http://127.0.0.1:3000**, niet op `localhost`. Sinds 2025 accepteert Spotify `localhost`
niet meer als redirect-URI. De redirect-URI in `.env.local` moet **exact** gelijk zijn aan die in het
[Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Standaard is dat
`http://127.0.0.1:3000/api/auth/callback/spotify`.

## Waar de data staat

Deze repo is publiek. Geheimen en Spotify-brondata blijven daarom buiten git, op één map na:

| Map | Inhoud | In git? |
|---|---|---|
| `.data/spotify/` | geheimen: de OAuth-tokens | nee |
| `data/spotify/` | opgehaalde brondata: de snapshot, de historie, en de BPM-, wereld- en afgevinkt-stores | nee |
| `data/library/library.db` | de trackdatabase zelf (een lokale kopie, zie hieronder) | nee |
| `data/library/export/` | de trackbibliotheek als tekst: je eigen ID's en alle velden | **ja, en dus openbaar** |

### Persoonlijke regels: `data/spotify/private-rules.json`

Welk Spotify-account van jou is, en welke playlistnamen altijd in de wereld Privé horen, staat niet in
de code. Deze repo is publiek. Die gegevens staan in een lokaal bestand. Kopieer
`private-rules.example.json` naar `data/spotify/private-rules.json` en vul in:

- `ownerUserId`: je Spotify-user-id (het `owner.id` van je eigen playlists);
- `priveNamePatterns`: reguliere expressies (hoofdletterongevoelig) op de playlistnaam. Een playlist
  die er een raakt, gaat altijd naar Privé.

Ontbreekt het bestand, dan draait de app gewoon, maar telt elke playlist als "gevolgd" en klopt de
indeling niet. De serverconsole waarschuwt daarvoor (zie `src/lib/spotify/privateRules.ts`).

### Bestaande data uit life-hub meenemen

Draaide de Spotify-mirror eerder in `life-hub`, kopieer dan op die machine `life-hub/data/spotify/` en
`life-hub/.data/spotify/` naar dezelfde plek in deze repo, en ook de `SPOTIFY_*`-regels uit
`life-hub/.env.local`.

De mix-JSON's van de DJ Cylow-website worden alleen gelezen, nooit geschreven. De app zoekt ze in
`MIXES_DATA_DIR`, of anders in `src/data/mixes` of `../djcylow-react/src/data/mixes`
(zie `src/lib/mixes/mixStore.ts`).

## De trackdatabase

De eigen collectie (je eigen track-ID met de metadata, zonder audio) staat in één SQLite-bestand,
`data/library/library.db`. Het bestand gebruikt de SQLite die in Node zelf zit (22.13 of hoger), dus er
hoeft niets extra's geïnstalleerd te worden. Wil je het bestand ergens anders, zet dan `LIBRARY_DB_PATH`.

### Op elke machine dezelfde bibliotheek

De database zelf staat niet in git: een binair bestand valt niet te vergelijken of samen te voegen.
Wat wel in git staat, is een tekst-export in `data/library/export/`:

- `tracks.ndjson`: één regel per nummer, gesorteerd op `dkj_track_id`;
- `spotify_track_ids.ndjson`: welk Spotify-ID bij welk eigen ID hoort.

**De export is de bron, de database een kopie.** Elke stap die de bibliotheek opent (de sync op
`/spotify`, `library:import`, `library:assign-ids`) kijkt eerst of de export veranderd is sinds de
database hem het laatst las of schreef. Zo ja (een verse kloon, of een `git pull` met nieuwe data), dan
wordt de database uit de export opnieuw opgebouwd. Na elke schrijvende stap wordt de export meteen
bijgewerkt. Je hoeft dus alleen te committen en te pushen:

```sh
git add data/library/export && git commit -m "data: bibliotheek bijgewerkt" && git push
```

Na een verse kloon of een pull kun je de database ook direct opbouwen met `npm run library:sync`.
Kolommen die niet (meer) in `fields.ts` staan, gaan niet mee in de export. Hoe het werkt staat in
`src/lib/library/libraryFile.ts`. Let op: omdat de repo publiek is, zijn ook je `notes` en `tags` voor
iedereen te lezen zodra je ze pusht.

### Importeren

```sh
npm run library:import -- pad/naar/tracks.csv    # of .json
```

- **CSV**: de kopregel bestaat uit `dkj_track_id` plus veldnamen uit `src/lib/library/fields.ts`, gescheiden
  door `,` of `;` (Excel). Een lijstveld zoals `artists` mag als `"Artiest A; Artiest B"`, maar zet het
  tussen aanhalingstekens als `;` ook je scheidingsteken is. **Een lege cel laat de bestaande waarde
  staan.**
- **JSON**: een lijst objecten, of `{ "tracks": [...] }`. `null` maakt een veld leeg.

Het script mag je vaker draaien. Een bestaande `dkj_track_id` wordt bijgewerkt en niet dubbel toegevoegd,
en alleen de kolommen in het bestand worden aangeraakt. Klopt er één rij niet (een onbekende
kolomnaam, `12.5` in een geheel-getalveld), dan wordt er niets geschreven en meldt het script welke
rij het is.

### Eigen track-ID's uit Spotify

Elk nummer dat in je Spotify-playlists voorkomt, krijgt een eigen ID in `dkj_track_id`. Het ID bestaat uit
de artiest-ID's van alle artiesten van het nummer (zie hieronder), in dezelfde volgorde als
`dkj_artist_ids` (de hoofdartiest eerst), met een streepje ertussen. Daarachter komt nog een streepje en een
volgnummer. Firestarter van The Prodigy (`PRO02`) is `PRO02-21`. Cobra Dance van Billy Esteban (`BIL09`) en
Cafe De Anatolia (`CAF01`) is `BIL09-CAF01-03`.

Het volgnummer telt per combinatie van artiesten. Het is het laagste nummer dat voor die combinatie nog vrij
is, heeft minstens twee cijfers en loopt na 99 gewoon door (`IMM01-143`). Het laatste stuk na een streepje
is dus altijd het volgnummer. Heeft geen van de artiesten een eigen ID, dan begint het ID met `XXX00`.

Dit gebeurt na elke sync op `/spotify` automatisch. Voor een snapshot die er al ligt, draai je:

```sh
npm run library:assign-ids
```

- **Eén ID per nummer, niet per Spotify-track.** Dezelfde opname staat vaak meerdere keren op Spotify
  (single, album, compilatie). Twee tracks met dezelfde titel (hoofdletters en randspaties tellen niet
  mee) en precies dezelfde artiesten krijgen hetzelfde ID. Een remix of "Radio Edit" heeft een andere
  titel en blijft dus een eigen nummer.
- **Een ID verandert niet meer.** De tabel `spotify_track_ids` onthoudt welk Spotify-ID bij welk eigen ID
  hoort. Een nieuwe variant van een bekend nummer krijgt het bestaande ID, ook als de oude variant niet
  meer in je playlists staat. Pas je `dkj_artist_ids` later zelf aan, dan blijft het ID ook staan. De
  enige uitzondering was de overstap naar dit formaat op 27 september 2026. Toen zijn de oude ID's
  (`T000001`, en kort daarna een variant met alleen de hoofdartiest) één keer omgenummerd, per
  artiestencombinatie in de volgorde van hun oude nummer.
- **Wat je zelf invult, blijft staan.** Een nieuw nummer krijgt bij het aanmaken titel, artiesten, album
  en duur van Spotify. Daarna past de toekenning die rij niet meer aan.

De regels staan bovenaan `src/lib/library/trackIds.ts`.

### Eigen artiest-ID's

Elke artiest krijgt bij dezelfde stap een eigen ID: drie letters en een nummer, bijvoorbeeld `PRO01`.
De ID's staan in de tabel `artists` (en in de export als `artists.ndjson`). Elke track krijgt in
`dkj_artist_ids` de lijst ID's van zijn artiesten, met de hoofdartiest eerst.

- **De letters zijn de eerste drie van de naam.** Een lidwoord vooraan telt niet mee: The Prodigy wordt
  `PRO`, De Dijk `DIJ`. Accenten gaan eraf (Röyksopp → `ROY`), en tekens die geen letter zijn tellen niet
  mee. Een naam met minder dan drie letters wordt aangevuld met `X`: U2 → `UXX01`.
- **Het nummer is het laagste dat nog vrij is** voor die letters: `MAR01`, `MAR02`, … Raakt een groep
  vol, dan gaat het door met `MAR100`, zodat elke artiest een ID krijgt.
- **Eén ID per Spotify-artiest.** Twee artiesten met dezelfde naam houden elk hun eigen ID, en een
  artiest die op Spotify van naam verandert, houdt zijn ID.
- **Een zelf ingevulde `dkj_artist_ids` blijft staan.**

Daarnaast krijgt elke track in `dkj_artist` precies één artiest: de eerste uit `artists`, dus de
hoofdartiest. Ook die wordt alleen gevuld zolang hij leeg is; wat je zelf invult, blijft staan.

De regels staan bovenaan `src/lib/library/artistIds.ts`.

### Velden met vaste keuzes

`dkj_bpm` en `dkj_album` accepteren alleen hun eigen opties; elke andere waarde breekt de import af.
Hoofdletters en spaties tellen niet mee (`128 bpm` wordt `128BPM`).

- **`dkj_bpm`**: `128BPM`, `112BPM`, `176BPM`, `144BPM`, `96BPM`.
- **`dkj_album`**: een kleur met `Light (f)`, `Full (f)`, `Light (m)` of `Full (m)`, bijvoorbeeld
  `Green Light (f)`. De acht kleuren zijn Green, Yellow, Red, Purple, Cyan, Blue, Orange en Magenta.

### Een veld toevoegen

Voeg in `src/lib/library/fields.ts` één regel toe aan `TRACK_FIELDS`:

```ts
{ key: "energy", type: "integer", label: "Energie 1-10" },
```

Bij de volgende import of app-start krijgt de database die kolom zelf. Bestaande tracks houden al hun
data en krijgen een lege waarde voor het nieuwe veld. De typen zijn `text`, `integer`, `real`,
`boolean` en `json` (voor lijsten). Een `text`-veld kan met `options` een vaste lijst keuzes krijgen. Hernoemen gaat met `renamedFrom`. Haal je een veld weg, dan blijft
de kolom met de data gewoon in de database staan. De regels staan bovenaan `fields.ts`.

## Poorten

```sh
npm test            # Vitest
npm run typecheck   # tsc --noEmit
npm run lint
```
