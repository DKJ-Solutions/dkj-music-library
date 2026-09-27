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

Er komt geen persoonlijke data in git. Beide mappen staan in `.gitignore`:

| Map | Inhoud |
|---|---|
| `.data/spotify/` | geheimen: de OAuth-tokens |
| `data/spotify/` | opgehaalde brondata: de snapshot, de historie, en de BPM-, wereld- en afgevinkt-stores |

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

De eigen collectie (ongeveer 6000 tracks: je eigen track-ID met de metadata, zonder audio) staat in één
SQLite-bestand, `data/library/library.db`. Die map valt onder `data/` en blijft dus buiten git. Het
bestand gebruikt de SQLite die in Node zelf zit (22.13 of hoger), dus er hoeft niets extra's
geïnstalleerd te worden. Wil je het bestand ergens anders, zet dan `LIBRARY_DB_PATH`.

### Importeren

```sh
npm run library:import -- pad/naar/tracks.csv    # of .json
```

- **CSV**: de kopregel bestaat uit `track_id` plus veldnamen uit `src/lib/library/fields.ts`, gescheiden
  door `,` of `;` (Excel). Een lijstveld zoals `artists` mag als `"Artiest A; Artiest B"`, maar zet het
  tussen aanhalingstekens als `;` ook je scheidingsteken is. **Een lege cel laat de bestaande waarde
  staan.**
- **JSON**: een lijst objecten, of `{ "tracks": [...] }`. `null` maakt een veld leeg.

Het script mag je vaker draaien. Een bestaande `track_id` wordt bijgewerkt en niet dubbel toegevoegd,
en alleen de kolommen in het bestand worden aangeraakt. Klopt er één rij niet (een onbekende
kolomnaam, `12.5` in een geheel-getalveld), dan wordt er niets geschreven en meldt het script welke
rij het is.

### Eigen track-ID's uit Spotify

Elk nummer dat in je Spotify-playlists voorkomt, krijgt een eigen, oplopend ID: `T000001`, `T000002`,
enzovoort. Dat gebeurt na elke sync op `/spotify` automatisch. Voor een snapshot die er al ligt, draai je:

```sh
npm run library:assign-ids
```

- **Eén ID per nummer, niet per Spotify-track.** Dezelfde opname staat vaak meerdere keren op Spotify
  (single, album, compilatie). Twee tracks met dezelfde titel (hoofdletters en randspaties tellen niet
  mee) en precies dezelfde artiesten krijgen hetzelfde ID. Een remix of "Radio Edit" heeft een andere
  titel en blijft dus een eigen nummer.
- **Een ID verandert nooit.** De tabel `spotify_track_ids` onthoudt welk Spotify-ID bij welk eigen ID
  hoort. Een nieuwe variant van een bekend nummer krijgt het bestaande ID, ook als de oude variant niet
  meer in je playlists staat.
- **Wat je zelf invult, blijft staan.** Een nieuw nummer krijgt bij het aanmaken titel, artiesten, album
  en duur van Spotify. Daarna past de toekenning die rij niet meer aan.

De regels staan bovenaan `src/lib/library/trackIds.ts`.

### Een veld toevoegen

Voeg in `src/lib/library/fields.ts` één regel toe aan `TRACK_FIELDS`:

```ts
{ key: "energy", type: "integer", label: "Energie 1-10" },
```

Bij de volgende import of app-start krijgt de database die kolom zelf. Bestaande tracks houden al hun
data en krijgen een lege waarde voor het nieuwe veld. De typen zijn `text`, `integer`, `real`,
`boolean` en `json` (voor lijsten). Hernoemen gaat met `renamedFrom`. Haal je een veld weg, dan blijft
de kolom met de data gewoon in de database staan. De regels staan bovenaan `fields.ts`.

## Poorten

```sh
npm test            # Vitest
npm run typecheck   # tsc --noEmit
npm run lint
```
