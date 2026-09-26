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

## Poorten

```sh
npm test            # Vitest
npm run typecheck   # tsc --noEmit
npm run lint
```
