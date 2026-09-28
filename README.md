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

- `ownerUserId`: je Spotify-user-id (het `owner.id` van je eigen playlists). Alleen die playlists
  vullen de trackdatabase (zie [Alleen eigen playlists](#alleen-eigen-playlists));
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

### Het Trackregister bekijken

Start de app (`npm run dev`) en open `/spotify/trackregister`; op `/spotify` staat de link bovenaan. Je
ziet elk nummer met zijn eigen velden, en je kunt zoeken en filteren op `dkj_bpm` en `dkj_album`. De
pagina leest de bibliotheek en niet de Spotify-snapshot, dus hij werkt op elke kloon van de repo, ook
zonder Spotify-login of sync. Een lege of ontbrekende database wordt bij het openen uit de export
opgebouwd.

### Maple Classic 2026 LAN

`/spotify/maple-classic` toont één playlist als tabel: Maple Classic 2026 LAN (van Jellootje). Je kunt
zoeken op titel, artiest of album en sorteren op elke kolom. De pagina leest de Spotify-snapshot, dus je
hebt eerst een sync nodig. De link staat bovenaan op `/spotify`.

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

Elk nummer dat in je eigen Spotify-playlists voorkomt, krijgt een eigen ID in `dkj_track_id`. Het ID bestaat uit
de artiest-ID's van alle artiesten van het nummer (zie hieronder), in dezelfde volgorde als
`dkj_artist_id` (de hoofdartiest eerst), met een streepje ertussen. Daarachter komt nog een streepje en een
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
- **Nooit een live-variant.** Een live-opname ("Clocks - Live", "Neon - Live at the Nokia Theatre, …")
  is hetzelfde nummer als de studioversie en krijgt dus hetzelfde ID. De rij houdt de titel en de
  Spotify-gegevens van de studioversie. Staat een nummer alleen live in je playlists, dan krijgt het de
  titel zonder live-aanduiding. Komt de studioversie later binnen, dan neemt die zijn plaats in. Live
  wordt alleen aan de titel herkend: "Live Forever" blijft gewoon "Live Forever". Op 27 september 2026
  is de bestaande bibliotheek één keer rechtgezet, en daarbij kreeg de samengevoegde rij het laagste ID
  van de groep. De regels staan in `src/lib/library/liveTitle.ts` en `liveVariants.ts`.
- **Een ID verandert niet meer.** De tabel `spotify_track_ids` onthoudt welk Spotify-ID bij welk eigen ID
  hoort. Een nieuwe variant van een bekend nummer krijgt het bestaande ID, ook als de oude variant niet
  meer in je playlists staat. Pas je `dkj_artist_id` later zelf aan, dan blijft het ID ook staan. De
  enige uitzondering was de overstap naar dit formaat op 27 september 2026. Toen zijn de oude ID's
  (`T000001`, en kort daarna een variant met alleen de hoofdartiest) één keer omgenummerd, per
  artiestencombinatie in de volgorde van hun oude nummer.
- **Wat je zelf invult, blijft staan.** Een nieuw nummer krijgt bij het aanmaken titel, artiesten, album
  en duur van Spotify. Daarna past de toekenning die rij niet meer aan.

De regels staan bovenaan `src/lib/library/trackIds.ts`.

### Alleen eigen playlists

Alleen de playlists van je eigen account (`ownerUserId` in `private-rules.json`) vullen de
bibliotheek. Een gedeelde playlist, van een ander account dat je volgt en ook als je eraan meewerkt,
staat wel op `/spotify`, maar levert geen nummers, geen artiesten en geen regel in `spotify_playlist`.

- **Staat een nummer ook in een eigen playlist, dan blijft het.** De gedeelde playlist telt dan
  alleen niet als bron.
- **Wat alleen in gedeelde playlists staat, gaat eruit**, bij elke sync. De koppelingen in
  `spotify_track_ids` gaan mee, en daarna ook elke artiest die bij geen enkel nummer meer hoort. Op
  28 september 2026 waren dat 821 nummers en 392 artiesten. Zet je zo'n nummer later in een eigen
  playlist, dan komt het terug met een nieuw ID.
- **Een nummer dat in geen enkele playlist meer staat, blijft staan.** De bibliotheek is een back-up.
- Ontbreekt `ownerUserId`, dan valt eigen niet van gedeeld te onderscheiden. Dan telt alles mee en gaat
  er niets weg.

De regels staan in `src/lib/library/ownPlaylists.ts`.

### Eigen artiest-ID's

Elke artiest krijgt bij dezelfde stap een eigen ID: drie letters en een nummer, bijvoorbeeld `PRO01`.
De ID's staan in de tabel `artists` (en in de export als `artists.ndjson`). Elke track krijgt in
`dkj_artist_id` (tot 27 september 2026 `dkj_artist_ids`) de lijst ID's van zijn artiesten, met de hoofdartiest eerst.

- **De letters zijn de eerste drie van de naam.** Een lidwoord vooraan telt niet mee: The Prodigy wordt
  `PRO`, De Dijk `DIJ`. Accenten gaan eraf (Röyksopp → `ROY`), en tekens die geen letter zijn tellen niet
  mee. Een naam met minder dan drie letters wordt aangevuld met `X`: U2 → `UXX01`.
- **Het nummer is het laagste dat nog vrij is** voor die letters: `MAR01`, `MAR02`, … Raakt een groep
  vol, dan gaat het door met `MAR100`, zodat elke artiest een ID krijgt.
- **Eén ID per Spotify-artiest.** Twee artiesten met dezelfde naam houden elk hun eigen ID, en een
  artiest die op Spotify van naam verandert, houdt zijn ID.
- **Een zelf ingevulde `dkj_artist_id` blijft staan.**

Daarnaast krijgt elke track in `dkj_artist` precies één artiest. De artiest die de remix of edit maakte,
gaat altijd voor: staat een van de artiesten van de track in het versiedeel van de titel (`Filmic - CRi
Remix` → CRi, `Falling (JORDAZ Radio Mix)` → JORDAZ), dan is die het. Anders is het de eerste uit
`artists`, de hoofdartiest. Staat de remixer niet bij de track, dan telt de naam uit de titel
(`The Wolves - Lenzman Remix` → Lenzman). Een stijl leest dan ook als naam (`Techno Mix` → Techno);
alleen woorden als `Radio`, `Original`, `Extended`, een jaartal of een plaatformaat tellen niet
(`Levels - Radio Edit` blijft Avicii). De regels staan in `src/lib/library/primaryArtist.ts`. En in `dkj_albumartiest` de hele rij artiesten als één tekst, in de volgorde van Spotify,
met komma's ertussen (`Aaron Smith, Indiblu, JORDAZ`). Beide worden alleen gevuld zolang ze leeg zijn;
wat je zelf invult, blijft staan.

De regels staan bovenaan `src/lib/library/artistIds.ts`.

### De bestandsnaam: `dkj_file`

`dkj_file` is de naam die het bestand op je desktop zou hebben, zonder extensie:
`<artiesten> - <titel> (<versie>)`. Bijvoorbeeld `Higher - David Penn Remix` van Abel Ramos en David
Penn wordt `Abel Ramos - Higher (David Penn Remix)`.

- De artiesten staan met `, ` ertussen en `&` voor de laatste (`Airdraw, Jo.E & Aaren`). Een remixer
  staat al in de versie en gaat er dus uit, behalve als hij ook de hoofdartiest is. Wie de titel als
  featuring noemt, staat er ook niet nog eens vooraan.
- Elk stuk na ` - ` komt tussen haakjes: `Levels - Radio Edit` wordt `Avicii - Levels (Radio Edit)`.
- Tekens die Windows niet in een bestandsnaam toestaat, gaan eruit (`/` `\` `:` worden `-`).

Ook dit veld wordt alleen gevuld zolang het leeg is. De regels staan in `src/lib/library/fileName.ts`.

`dkj_title` is alleen de titel, in dezelfde vorm als in `dkj_file` na de artiesten: `Higher - David Penn
Remix` wordt `Higher (David Penn Remix)`. Het is geen bestandsnaam, dus tekens als `?` en `:` blijven
staan. Ook dit veld wordt alleen gevuld zolang het leeg is. Het trackregister toont `dkj_title` en niet
`dkj_file`, en ook `dkj_artist` en `dkj_track_id` niet; op alle drie zoeken kan nog wel.

### De playlists: `spotify_playlist`

`spotify_playlist` (tot 27 september 2026 `dkj_playlists`) is de lijst Spotify-playlists waarin een track staat, elk met ID en naam, in de volgorde
van je playlists. Anders dan de andere eigen velden wordt dit veld bij elke sync opnieuw gezet: het is
een feit van Spotify, geen keuze van jou. Let op: de playlistnamen staan daarmee in de publieke export,
ook die uit de wereld Privé. Daarvoor is bewust gekozen, zodat het register ze op elke machine toont. De
regels staan in `src/lib/library/playlistLinks.ts`.

### De mixen: `djcylow_mix`

`djcylow_mix` is de lijst mixen op djcylow.com waarin een track zit, elk met de slug van de mixpagina en
de titel van de mix; in het register linkt elke naam naar `https://djcylow.com/luister/mix/<slug>`. De
koppeling loopt via Spotify, net als bij `spotify_playlist`: de brug koppelt elke mix aan zijn eigen
MMC-playlist, en een track zit in een mix als hij in die playlist staat. Een mix die alleen in een grote
kleur-emmer is teruggevonden, telt niet. Ook dit veld wordt bij elke sync opnieuw gezet, maar alleen als
de mix-bron (`djcylow-react`, zie `MIXES_DATA_DIR`) op deze machine te vinden is; zonder bron blijft het
staan zoals het was. De regels staan in `src/lib/library/djcylowMixes.ts`.

### Het jaar: `year`

`year` (tot 28 september 2026 `release_year`, dat toen nog nergens gevuld was) is het jaar waarin
het nummer uitkwam, uit de `release_date` van het Spotify-album. Staat hetzelfde nummer op meer
albums (single, album, compilatie), dan telt het vroegste jaar. Een single uit 1997 op een compilatie
uit 2015 blijft dus 1997. Kent Spotify alleen de compilatie, dan is dat het jaar. Ook dit veld wordt
alleen gevuld zolang het leeg is, en het trackregister toont het in de kolom `year`. De regels staan in
`src/lib/library/releaseYears.ts`.

### Velden met vaste keuzes

`dkj_bpm`, `dkj_album` en `dkj_group` accepteren alleen hun eigen opties; elke andere waarde breekt de import af.
Hoofdletters en spaties tellen niet mee (`128 bpm` wordt `128BPM`).

- **`dkj_group`**: een lijst uit `MMC`, `DJ CYLOW`, `Prive` en `Overige`. De sync vult hem zolang hij
  leeg is met de werelden van de playlists van de track (een playlist met een beschrijving telt
  sowieso als MMC); staat een track in meer werelden, dan heeft hij meer groepen. `Overige` zet je
  zelf (`src/lib/library/groupFromWorlds.ts`).
- **`dkj_bpm`**: `128BPM`, `112BPM`, `176BPM`, `144BPM`, `96BPM`. Het veld wordt bij elke sync uit de
  playlists afgeleid zolang het leeg is: een BPM in de naam (`128BPM EDM`), House Mix is 128, Drum &
  Bass en D&B/DNB zijn 176. Noemen de playlists verschillende BPM's, dan wint de meest genoemde; bij
  een gelijke stand blijft het leeg (`src/lib/library/bpmFromPlaylists.ts`).
- **`dkj_album`**: een kleur met `Light (f)`, `Full (f)`, `Light (m)` of `Full (m)`, bijvoorbeeld
  `Green Light (f)`. De acht kleuren zijn Green, Yellow, Red, Purple, Cyan, Blue, Orange en Magenta.
  Het veld wordt bij elke sync uit de playlists afgeleid zolang het leeg is: noemen alle playlists van
  een track (`Magenta Light (m) ♦️ 128BPM EDM`) hetzelfde album, dan wordt dat het album. Noemen ze
  verschillende albums, dan blijft het leeg en kies je zelf (`src/lib/library/albumFromPlaylists.ts`).

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
