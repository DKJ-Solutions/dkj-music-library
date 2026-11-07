# Changelog

## [Unreleased]

**35 / 45 minor entries** <!-- pending-tally -->

### DEPLOY: fix/164-house-style-pin · 20261107-181359Z

`src/styles/house/house-style.css` is the v6.10.0 brand book copy again, so the `house-style` check is green on `main`. Only three comments changed; nothing looks different.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

house-style.css to the v6.10.0 pin

[PR #166](https://github.com/DKJ-Solutions/dkj-music-library/pull/166)

---

### DEPLOY: feat/143-dkj-folder-move · 20261107-180944Z

The workflow folder moved from the repo root `dkj-policy/` to `.dkj/dkj-policy/`, the home every plugin of the marketplace now uses (DKJ-Solutions/dkj-marketplace#3870). `scripts/repo-config.ps1` points at the new paths, and `CLAUDE.md` imports the `dkj-solutions` extension at its current path, so that extension's rules load again.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Move the workflow folder from dkj-policy/ to .dkj/dkj-policy/

[PR #165](https://github.com/DKJ-Solutions/dkj-music-library/pull/165)

---

### DEPLOY: fix/148-house-style-type-colour · 20261107-174049Z

The app's own styling now reads every font size, weight and derived colour from the house brand book or a named domain token, so the `house-style` check is green again. Text that was set in-between sizes (12.5px, 13.5px, semibold) now sits on the house scale, so some labels are a touch larger or bolder.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Map the repo layer's sizes, weights and derived colours onto house tokens

[PR #163](https://github.com/DKJ-Solutions/dkj-music-library/pull/163)

---

### DEPLOY: fix/149-drop-eyebrows · 20261107-173713Z

The section labels on the Spotify dashboard, the playlists/mixes bridge, the MusicMoodColours page and the playlist manager are headings again: each is now its section's `h2` in the house heading style, with its count beside it, instead of the plain text it had become after the v6.9.0 brand book dropped `.eyebrow`.

**Score:** 3

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Eyebrow labels lost their house styling

[PR #162](https://github.com/DKJ-Solutions/dkj-music-library/pull/162)

---

### DEPLOY: feat/151-pc-spotify-fuzzy-link · 20261107-173324Z

`/compare/pc-spotify` now suggests a local file for a track whose file name is spelt differently (`ft.` for `feat.`, a renamed file), so it no longer shows up both as *to download* and as *local only*. You confirm or correct the suggestion with one click, or link any track to a file by hand; the link is stored in `dkj_local_file` and travels with the library export.

**Score:** 3

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

PC <-> Spotify: suggest a fuzzy match and link a file by hand

[PR #161](https://github.com/DKJ-Solutions/dkj-music-library/pull/161)

---

### DEPLOY: docs/159-readme-werkbak-move · 20261107-164913Z

The README's list of what the app writes to Spotify now also names moving a track from one werkbak to another, which lands it at the bottom of the target werkbak.

**Score:** 1 -- prevents a reader trusting the README that the app never adds or removes a track in a Spotify playlist, which has not been true since the move between werkbakken landed.

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

README: name the move between werkbakken among the app's Spotify writes

[PR #160](https://github.com/DKJ-Solutions/dkj-music-library/pull/160)

---

### DEPLOY: fix/123-spotify-config-melding · 20261107-164616Z

Without Spotify credentials the Login card on /spotify now says so itself, with the setup steps (copy `.env.local.example` to `.env.local` and fill in the client ID and secret from the Spotify Developer Dashboard, or keep a filled-in copy in OneDrive), in place of the login button. The login route no longer answers a browser with raw JSON: it sends it back to /spotify, where the card explains what is missing.

**Score:** 2

#### What makes this deploy extra special

A fresh checkout without keys no longer strands the owner on a bare JSON page; the fix is named on the page they were already on.

**Score:** 2

#### Pull Request

Missing Spotify credentials show a setup notice instead of raw JSON

[PR #154](https://github.com/DKJ-Solutions/dkj-music-library/pull/154)

---

### DEPLOY: feat/145-desktop-mirror · 20261107-155253Z

The Desktop mirror is built: `/mirror` (with its own card on Home) mirrors the working drive with the music and the rekordbox library one way to a reserve drive, with robocopy. A dry run first lists what will be copied and what will be deleted on the reserve, and only then does a button mirror exactly that plan: the server runs a fresh dry run first and refuses if anything changed. It also refuses while rekordbox runs, when a drive is missing, when the two paths overlap, and when a file on the reserve is newer than on the working drive. The page shows the time of the last successful mirror. The two paths go in `data/mirror/config.json` (see `mirror-config.example.json`).

**Score:** 4

#### What makes this deploy extra special

A dead working drive now costs at most the changes since the last mirror, and the mirror can never quietly throw away work done on the reserve.

**Score:** 4

#### Pull Request

Desktop mirror: one-way mirror of the working music drive to a reserve drive

[PR #158](https://github.com/DKJ-Solutions/dkj-music-library/pull/158)

---

### DEPLOY: feat/144-pc-spotify-scan · 20261107-154921Z

`/compare/pc-spotify` heeft een bron: zet in `data/local/local-music.json` het pad naar je muziekmap (zie
`local-music.example.json`), en de pagina toont per playlist wat in Spotify staat maar nog niet als bestand in die
map, plus de bestanden zonder track en het aantal gekoppelde tracks. De map wordt alleen gelezen. Een bestand
koppelt aan een track als zijn naam zonder extensie gelijk is aan `dkj_file`.

**Score:** 4

#### What makes this deploy extra special

De downloadlijst was het hele doel van de PC-kant: wat nog gedownload moet worden, staat nu op één pagina in plaats
van in je hoofd.

**Score:** 4

#### Pull Request

PC <-> Spotify: lokale muziekmap scannen en tonen wat nog gedownload moet worden

[PR #157](https://github.com/DKJ-Solutions/dkj-music-library/pull/157)

---

### DEPLOY: fix/142-brandbook-pin · 20261107-154518Z

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

[PR #156](https://github.com/DKJ-Solutions/dkj-music-library/pull/156)

---

### DEPLOY: feat/134-move-track-between-werkbakken · 20261107-154117Z

Every row of a werkbak table (`/mixen/preparation/<id>`) now has a ⇄ menu at the right that moves the track to another werkbak. The hub adds it at the bottom of the chosen werkbak in Spotify first and only then removes it from this one, so a failure leaves the track in both rather than in neither, and it says so. Both werkbakken are fetched again afterwards, and a local order that has not been pushed yet survives the move. This is the first time the hub adds or removes tracks in a Spotify playlist, and it only does so between werkbakken.

**Score:** 3

#### What makes this deploy extra special

A great track that does not fit this mix moves to the werkbak where it belongs in two clicks, instead of being dropped or moved by hand in Spotify.

**Score:** 3

#### Pull Request

Move a track from one werkbak to another preparation playlist

[PR #155](https://github.com/DKJ-Solutions/dkj-music-library/pull/155)

---

### DEPLOY: fix/152-readme-spotify-writes · 20261107-153412Z

The README now lists every write the app makes to Spotify: a mix playlist's name and description, and the track order of a werkbak. It used to say the app writes only the name and description.

**Score:** 1 -- prevents a reader trusting the README that the app never changes a playlist's contents, which has not been true since the werkbak order was added.

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

README: list every write the app makes to Spotify

[PR #153](https://github.com/DKJ-Solutions/dkj-music-library/pull/153)

---

### DEPLOY: fix/147-triage-label-names · 20261107-152121Z

The triage-label seam in `scripts/repo-config.ps1` now declares the current label names
(`awaiting-recurrences`, `awaiting-decision-dev` and the other `awaiting-*` parking labels) instead of the
retired `dossier` and `needs-decision`, so `adopt-triage-labels` prints the labels the sweeps actually set
(#147). Only this repo's own workflow tooling notices.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

repo-config.ps1 declares the triage labels under their current names

[PR #150](https://github.com/DKJ-Solutions/dkj-music-library/pull/150)

---

### DEPLOY: fix/128-env-onedrive-retry · 20261107-151243Z

When the Spotify keys are missing at the moment the hub needs them, it now copies `.env.local` from OneDrive again and loads the keys straight away. Before, `predev` copied it only once at start, and OneDrive was often still syncing then, so the login showed a "SPOTIFY_CLIENT_ID en/of SPOTIFY_CLIENT_SECRET ontbreken" error until somebody ran `npm run env:onedrive` by hand. That error now also names that command.

**Score:** 2

#### What makes this deploy extra special

On a fresh session the Spotify login works as soon as OneDrive has synced the file, without a restart or a manual copy.

**Score:** 2

#### Pull Request

Retry the OneDrive .env.local copy when the Spotify keys are missing

[PR #146](https://github.com/DKJ-Solutions/dkj-music-library/pull/146)

---

### DEPLOY: feat/140-local-first-playlist-order · 20261105-174237Z

Dragging a track on a werkbak page (`/mixen/preparation/<id>`) now only saves the new order in the hub. A Push button on every werkbak sends all moves to Spotify in one go. One push replaces the checks, writes and refetches each single drag used to cost, so the hub hits Spotify's rate limit far less, and dragging no longer waits on Spotify. If tracks were added to or removed from the playlist in Spotify in the meantime, the push and Fetch rebase the local order onto it: new tracks go to the bottom and vanished ones drop out. The local order is no longer thrown away.

**Score:** 3

#### What makes this deploy extra special

Dave sorts his werkbakken without running into rate limits, and he decides himself when Spotify follows.

**Score:** 4

#### Pull Request

Save werkbak drag moves locally first and push them to Spotify in bulk

[PR #141](https://github.com/DKJ-Solutions/dkj-music-library/pull/141)

---

### DEPLOY: fix/connection-card-center · 20261031-185614Z

De kaarten Login en Sync op /spotify rekken in hun `.grid-3` mee tot de hoogste kaart, waardoor de kop van de lagere kaart bovenaan bleef staan met lege ruimte eronder. Een eigen klasse `.verbinding-card` zet de inhoud van beide kaarten nu verticaal in het midden.

**Score:** 1 -- cosmetisch; voorkomt een scheef ogende rij kaarten.

#### What makes this deploy extra special

Wie /spotify opent, ziet de kop van Login en Sync in het midden van de kaart in plaats van bovenaan.

**Score:** 1 -- cosmetisch.

#### Pull Request

De kaartkop van Login en Sync verticaal in het midden van de kaart

[PR #139](https://github.com/DKJ-Solutions/dkj-music-library/pull/139)

---

### DEPLOY: feat/sync-button-direction · 20261031-142237Z

De twee knoppen in de kop van een werkbak heten nu **Push** en **Fetch**, zoals in git. Push (pijl omhoog)
stuurt de lokale volgorde naar Spotify, Fetch (pijl omlaag) haalt de playlist opnieuw op uit Spotify. Fetch was
"Sync met Spotify" en heet ook op de pagina van een gepubliceerde mix zo.

**Score:** 2

#### What makes this deploy extra special

Wie tijdens een rate limit verplaatst, ziet meteen welke knop de lokale volgorde naar Spotify stuurt en welke
hem juist overschrijft met wat in Spotify staat.

**Score:** 2

#### Pull Request

Werkbak-knoppen tonen in welke richting ze syncen

[PR #138](https://github.com/DKJ-Solutions/dkj-music-library/pull/138)

---

### DEPLOY: feat/werkbak-pending-order · 20261031-140350Z

Verplaatsen in een werkbak werkt nu ook als Spotify de hub met een lange rate limit blokkeert: de hub bewaart de
volgorde zelf en toont die meteen. Een knop in de kop laat zien hoeveel verplaatsingen nog niet in Spotify staan
en vanaf hoe laat syncen weer kan; op dat moment wordt hij vanzelf klikbaar en stuurt hij de volgorde naar Spotify.
Is de playlist in Spotify intussen echt veranderd (tracks erbij of eraf), dan schrijft hij niets en kun je de
lokale volgorde weggooien.

**Score:** 3

#### What makes this deploy extra special

Wie de hub gebruikt, kan tijdens een Spotify-blokkade gewoon doorwerken aan de volgorde van een werkbak in plaats
van uren te wachten.

**Score:** 3

#### Pull Request

Werkbak-volgorde lokaal bewaren tijdens een Spotify rate limit, met een knop om later te syncen

[PR #137](https://github.com/DKJ-Solutions/dkj-music-library/pull/137)

---

### DEPLOY: fix/spotify-retry-after-cap · 20261031-133305Z

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

[PR #136](https://github.com/DKJ-Solutions/dkj-music-library/pull/136)

---

### DEPLOY: feat/werkbak-drag-order · 20261031-131625Z

Op een werkbakpagina (/mixen/preparation/<id>) staat de tabel nu in de volgorde van de Spotify-playlist zelf, en je kunt een track met de greep links naar een andere plek slepen; die verplaatsing gaat direct naar de playlist in Spotify. Sleep je in Spotify, dan zet de sync-knop de pagina gelijk. Is de playlist in Spotify veranderd sinds de pagina laadde, dan verplaatst de app niets maar haalt eerst de nieuwe volgorde op. Dit is de eerste keer dat de app de inhoud van een playlist in Spotify wijzigt.

**Score:** 4

#### What makes this deploy extra special

Je bepaalt de kansrijkste tracks voor de volgende mix nu door ze bovenaan te slepen, en die volgorde staat ook in Spotify.

**Score:** 4

#### Pull Request

werkbak-volgorde slepen, in sync met de Spotify-playlist

[PR #135](https://github.com/DKJ-Solutions/dkj-music-library/pull/135)

---

### DEPLOY: fix/connection-grid-3 · 20261031-110819Z

The Login and Sync cards on /spotify now sit in a `.grid-3`, three to a row, so they match the width of the cards below them instead of each taking half the row.

**Score:** 1

#### What makes this deploy extra special

The Connection cards on /spotify are narrower and line up with the other sections.

**Score:** 2

#### Pull Request

Connection-sectie op /spotify in een grid-3

[PR #132](https://github.com/DKJ-Solutions/dkj-music-library/pull/132)

---

### DEPLOY: feat/play-button-left · 20261031-110621Z

De afspeelknop staat in elke tabel helemaal links: in de gewone tabel, in de verborgen kolommen (waar hij
eerst ontbrak) en op de mixpagina's, waar hij nu vóór de `#`-kolom staat.

**Score:** 2

#### What makes this deploy extra special

Wie het register gebruikt, vindt de afspeelknop nu in elke tabel op dezelfde plek, ook in de verborgen kolommen.

**Score:** 2

#### Pull Request

Afspeelknop altijd helemaal links in de tabel

[PR #131](https://github.com/DKJ-Solutions/dkj-music-library/pull/131)

---

### DEPLOY: feat/mix-rating · 20261031-105842Z

Het veld zit door het hele bibliotheekpad heen (schema, standaard bij de sync, de opslaanroute) en de
export kreeg het veld bij alle tracks.

**Score:** 3

#### What makes this deploy extra special

Een tweede waardering per nummer, `dkj_mix_rating`: niet hoe graag je het zelf luistert, maar hoe graag
je het in de volgende mix wilt gebruiken. Het trackregister toont hem als kolom `mix rating` direct naast
`dkj_rating`; op de mixpagina's (`/mixen/preparation`, `/mixen/published`) staat alleen de mix rating, en
de tabel opent daar met de hoogste mix rating bovenaan. Je wijzigt hem met hetzelfde potloodje. Elke track begint op
de waarde van zijn `dkj_rating`; daarna staan de twee los van elkaar.

**Score:** 4

#### Pull Request

Tweede waardering dkj_mix_rating: hoe graag je een nummer in de volgende mix wilt gebruiken

[PR #130](https://github.com/DKJ-Solutions/dkj-music-library/pull/130)

---

### DEPLOY: feat/preparation-card-to-spotify · 20261031-102841Z

De Preparation-kaart (naar /mixen/preparation, de Spotify-werkbakken op "Vol. X") staat niet meer op de hub
/mixen maar onder Playlists op /spotify, en daarmee ook op /spotify/playlists, die dezelfde kaarten toont. De
pagina zelf blijft op /mixen/preparation.

**Score:** 2

#### What makes this deploy extra special

De werkbakken zijn Spotify-playlists, dus de ingang staat nu bij de andere playlist-pagina's.

**Score:** 2

#### Pull Request

Preparation-kaart van /mixen naar de sectie Playlists op /spotify

[PR #129](https://github.com/DKJ-Solutions/dkj-music-library/pull/129)

---

### DEPLOY: fix/126-page-column · 20261030-173110Z

Every page now uses the house page column, so its blocks sit one even gap apart, as on the hub and /spotify, instead of each block bringing its own margin. The full-height pages (the Trackregister and the playlist and mix tables) keep their own window-filling layout.

**Score:** 2

#### What makes this deploy extra special

The whole app spaces its pages the same way, so a page no longer looks cramped or loose next to the hub.

**Score:** 2

#### Pull Request

Pages use the house .page-column shell instead of .wrap

[PR #127](https://github.com/DKJ-Solutions/dkj-music-library/pull/127)

---

### DEPLOY: feat/122-verbinding-house-style · 20261030-170135Z

/spotify is now one page in three sections: Connection (a Login card with the login action as the filled primary button, and a Sync card with a spinning icon while it runs), with the last sync's playlist and track counts under the Playlists heading, Playlists and Dashboard. /spotify/verbinding forwards there, so old links keep working. The vendored house stylesheet is now the v6.1.0 copy, so every grid in the app gets the house padding and panel background, and the house-style check is green again. A sync that fails because the Spotify login expired now says so in plain words with its own login button, and the status card updates to "Niet verbonden" instead of still claiming a connection.

**Score:** 3

#### What makes this deploy extra special

The owner can see at a glance whether Spotify is connected and how to log in again, without hunting for a hidden button.

**Score:** 3

#### Pull Request

De Spotify-verbindingspagina in de huisstijl

[PR #125](https://github.com/DKJ-Solutions/dkj-music-library/pull/125)

---

### DEPLOY: feat/env-from-onedrive · 20261030-151737Z

A fresh clone no longer needs the Spotify client ID and secret looked up again: `npm run dev` first copies `.env.local` from `%OneDrive%\dkj-solutions\dkj-music-library\` when the repo has no filled-in one of its own. A filled-in `.env.local` already in the repo is never overwritten, and the path comes from Windows' own `OneDrive` variable, so no user name lands in this public repo.

**Score:** 3

#### What makes this deploy extra special

The owner sets up a new checkout without hunting for the Spotify secret: store it once in OneDrive and every clone picks it up.

**Score:** 3

#### Pull Request

Spotify-sleutels uit OneDrive overnemen bij een verse clone

[PR #124](https://github.com/DKJ-Solutions/dkj-music-library/pull/124)

---

### DEPLOY: config/120-dkj-marketplace · 20261030-150523Z

Deze repo installeert zijn plugins nu uit `dkj-marketplace`, de nieuwe naam van de plugin-source sinds
v6.0.0 ([#120](https://github.com/DKJ-Solutions/dkj-music-library/issues/120)): de settings-keys, de
absolute imports en de CI-runners noemen die naam. Per machine worden de plugins één keer opnieuw
geïnstalleerd.

**Score:** 3

#### What makes this deploy extra special

N/A -- alleen de maintainer van deze repo ziet uit welke marketplace hij installeert.

**Score:** N/A

#### Pull Request

Naar de dkj-marketplace-marketplace verhuizen

[PR #121](https://github.com/DKJ-Solutions/dkj-music-library/pull/121)

---

### DEPLOY: feat/playing-row-highlight · 20261029-141025Z

De rij van de track die in de speler staat heeft nu een rand in de themakleur en een licht getint vlak, zodat je in de lange tabel direct ziet welke track speelt.

**Score:** 2

#### What makes this deploy extra special

Wie een werkbak doorloopt en een track afspeelt, ziet meteen welke rij dat is in plaats van naar het kleine stopicoon te zoeken.

**Score:** 2

#### Pull Request

Spelende rij duidelijker gemarkeerd in de tabel

[PR #119](https://github.com/DKJ-Solutions/dkj-music-library/pull/119)

---

### DEPLOY: feat/preparation-position-column · 20261029-140042Z

De tabel op elke werkbak-pagina onder /mixen/preparation heeft een eerste kolom `#` met de plek van elke track: 1 tot en met het aantal tracks, in de volgorde waarin de tabel ze toont. Na het sorteren op een kop staat 1 weer bovenaan. Onder rij 36 staat een lijn in de accentkleur: zoveel nummers heeft een mix meestal, dus daar heeft de werkbak genoeg voor de volgende stap. De afspeelknop in de tabel (ook op /spotify/trackregister) is omgekeerd: een gevulde cirkel in de themakleur met een neutraal icoon, zodat hij beter opvalt.

**Score:** 2

#### What makes this deploy extra special

Dave ziet in één oogopslag op welke plek een track in de werkbak staat, en of er al genoeg nummers voor een mix zijn.

**Score:** 2

#### Pull Request

Plek-kolom in de tabel van elke werkbak

[PR #118](https://github.com/DKJ-Solutions/dkj-music-library/pull/118)

---

### DEPLOY: feat/playlist-sync-button · 20261029-134619Z

Een eigen route en een gedeelde library-stap voor de sync van één playlist; de volledige sync gebruikt
dezelfde library-stap. `.wrap--full` zet de ruimte tussen zijn blokken nu met een gap in plaats van marges.

**Score:** 2

#### What makes this deploy extra special

Boven de tracktabel van een werkbak of mix staat een knop "Sync met Spotify": één klik haalt die playlist
opnieuw op en de tabel loopt weer gelijk, zonder de volledige sync van alle playlists af te wachten. Op alle
pagina's met een volle-breedte-tabel staat er nu wat meer ruimte tussen de kop en de tabel.

**Score:** 3

#### Pull Request

Sync-knop op tracktabellen van een Spotify-playlist

[PR #117](https://github.com/DKJ-Solutions/dkj-music-library/pull/117)

---

### DEPLOY: fix/register-player-in-view · 20261028-154446Z

Wie een track afspeelt in het Trackregister of op een werkbak-pagina, ziet de Spotify-speler nu helemaal:
de pagina scrolt de site-header weg, zodat de speler onderin het venster staat in plaats van er grotendeels
onder.

**Score:** 3

#### What makes this deploy extra special

N/A -- een app voor eigen gebruik; de lezer van deze notes is dezelfde ontwikkelaar.

**Score:** N/A

#### Pull Request

Spotify-speler scrolt zichzelf helemaal in beeld

[PR #116](https://github.com/DKJ-Solutions/dkj-music-library/pull/116)

---

### DEPLOY: fix/register-menu-toggle-align · 20261028-141623Z

De menuknop in het trackregister ("4 playlists ▾") schoof 7px naar links, zodat alleen de tekst erin
onder de kop stond en de knop zelf buiten de kolom uitstak. Die verschuiving is weg: de rand van de knop
begint nu op dezelfde lijn als de kop en de rest van de kolom.

**Score:** 1

#### What makes this deploy extra special

De knop staat netjes in de kolom in plaats van er links uit te steken.

**Score:** 2

#### Pull Request

Menuknop in het trackregister niet meer naar links verschoven

[PR #115](https://github.com/DKJ-Solutions/dkj-music-library/pull/115)

---

### DEPLOY: fix/register-menu-toggle-clipped · 20261028-135620Z

De menuknoppen in het trackregister ("4 playlists ▾", "2 groups ▾" enz.) vielen 7px te smal uit, waardoor het ▾ en de rechterrand werden afgekapt. Ze hebben nu hun volle breedte, en de tekst staat nog steeds recht onder de kolomkop.

**Score:** 1

#### What makes this deploy extra special

Wie het trackregister gebruikt ziet de menuknoppen weer heel, met pijltje en rand.

**Score:** 2

#### Pull Request

Menuknop in het trackregister niet meer afgekapt

[PR #114](https://github.com/DKJ-Solutions/dkj-music-library/pull/114)

---

### DEPLOY: feat/published-mix-track-table · 20261028-124327Z

De detailpagina van een gepubliceerde mix toont de tracks nu in de tabel van het trackregister (compact, zoals een werkbak op /mixen/preparation) in plaats van een genummerde lijst uit de mix-JSON. De rijen komen uit de bibliotheek via `djcylow_mix`.

**Score:** 2

#### What makes this deploy extra special

Per track van een mix zie je meteen rating, playlists en de rest van het register, en kun je erop sorteren.

**Score:** 3

#### Pull Request

Tracklist van een gepubliceerde mix als trackregister-tabel

[PR #113](https://github.com/DKJ-Solutions/dkj-music-library/pull/113)

---

### DEPLOY: feat/mix-square-thumbnail · 20261028-120658Z

De cards op /mixen/published tonen nu de vierkante thumbnail van de mix in plaats van het disc-icoon. De afbeelding komt uit `public/` van djcylow-react via een nieuwe route `/api/mixes/square/<slug>`; een mix zonder `image_square` (26 van de 86) houdt het disc-icoon.

**Score:** 2

#### What makes this deploy extra special

De mixenlijst is in één oogopslag te herkennen aan de covers, zoals op djcylow.com zelf.

**Score:** 3

#### Pull Request

Square thumbnail van de mix op de cards van /mixen/published

[PR #112](https://github.com/DKJ-Solutions/dkj-music-library/pull/112)

---

### DEPLOY: fix/emotion-magenta-hue · 20261028-095255Z

De emotiekleur magenta was Tailwind-fuchsia en leek naast purple op paars; hij staat nu op een echte magenta-tint.

**Score:** 1

#### What makes this deploy extra special

Magenta-stippen en -labels zijn weer te onderscheiden van purple.

**Score:** 2

#### Pull Request

magenta leest als magenta, niet als paars

[PR #111](https://github.com/DKJ-Solutions/dkj-music-library/pull/111)

---

### DEPLOY: feat/preparation-rating-column · 20261028-094703Z

In de tabellen van de werkbakken onder Mixen › Preparation staat de waardering nu links van de playlists,
direct naast de albumartiest.

**Score:** 1

#### What makes this deploy extra special

Wie een werkbak doorloopt, leest de waardering van een track meteen naast titel en artiest.

**Score:** 1

#### Pull Request

dkj_rating links van spotify_playlist in de werkbaktabellen

[PR #110](https://github.com/DKJ-Solutions/dkj-music-library/pull/110)

---

### DEPLOY: feat/preparation-card · 20261028-093807Z

Onder Mixen staat een nieuwe card, Preparation, met daaronder een kaart voor elke Spotify-playlist die op
"Vol. X" eindigt: de werkbakken waarin de tracks voor een mix al verzameld zijn maar de mix nog niet
gemaakt is. De volste werkbak staat vooraan. Elke kaart draagt een stip in de kleur van de playlist en opent een eigen pagina met de tabel van
het Trackregister, met alleen de tracks die al in die playlist staan: titel, albumartiest, playlists en
waardering, de hoogst gewaardeerde track bovenaan, zonder zoekbalk, filters of pager.

**Score:** 3

#### What makes this deploy extra special

Wie de app gebruikt, ziet in één overzicht welke mixen in voorbereiding zijn en hoe vol elke werkbak al is.

**Score:** 3

#### Pull Request

Preparation-card op /mixen, met een kaart per Vol. X-playlist

[PR #108](https://github.com/DKJ-Solutions/dkj-music-library/pull/108)

---

### DEPLOY: feat/planned-colour-cards · 20261027-155756Z

De pagina Planned onder Mixen toont acht kaarten, één per albumkleur (Cyan, Yellow, Blue, Green, Orange,
Magenta, Red, Purple), in dezelfde stijl als de andere kaarten, met een stip in de kleur zelf. Elke kaart
opent een eigen landingspagina voor de geplande mixen in die kleur, voorlopig nog leeg. Daarvoor stond er op
Planned alleen een lege melding.

**Score:** 2

#### What makes this deploy extra special

Wie de app gebruikt, ziet op Planned meteen de acht kleuren waar de geplande mixen onder komen te vallen.

**Score:** 2

#### Pull Request

Acht kleurkaarten op /mixen/planned

[PR #106](https://github.com/DKJ-Solutions/dkj-music-library/pull/106)

---

### DEPLOY: feat/compare-card · 20261027-150857Z

Op de homepagina staat een nieuwe card, Compare, met eronder twee vergelijkingen. Playlists ↔ Mixes is de
bestaande brug tussen de mixen van djcylow.com en de MMC-playlists, verhuisd vanaf zijn plek onder Music Mood
Colours (het oude adres stuurt door). PC ↔ Spotify staat er alvast als lege pagina, tot de pc-map gekoppeld is.

**Score:** 3

#### What makes this deploy extra special

De brug tussen mixen en playlists is nu direct vanaf de homepagina te bereiken, in plaats van drie lagen diep
onder Spotify, en er is een vaste plek voor de pc-vergelijking.

**Score:** 3

#### Pull Request

Compare-card op de homepagina, met Playlists ↔ Mixes en PC ↔ Spotify

[PR #105](https://github.com/DKJ-Solutions/dkj-music-library/pull/105)

---

### DEPLOY: feat/mixen-published-card · 20261027-150017Z

/mixen is nu een hub met twee cards, Published en Planned. Planned opent /mixen/planned, dat er alvast
staat maar nog leeg is. Published opent /mixen/published, met een card per mix die op
djcylow.com staat (nieuwste eerst); de detailpagina per mix staat voortaan op /mixen/published/<slug>.

**Score:** 2

#### What makes this deploy extra special

Wie de mixen bekijkt klikt nu eerst door via Published; de oude /mixen/<slug>-links bestaan niet meer.

**Score:** 2

#### Pull Request

Published-card op /mixen met alle mixen die op djcylow.com staan

[PR #104](https://github.com/DKJ-Solutions/dkj-music-library/pull/104)

---

### DEPLOY: feat/home-mixen-card · 20261027-140441Z

De homepagina draagt naast de Spotify-card een Mixen-card die doorklikt naar /mixen, met daar een card per mix van de DJ Cylow-website, nieuwste eerst, elk met genre, BPM en datum. Elke card opent een eigen detailpagina op /mixen/<slug> met de gegevens van de mix, de top-artiesten, de tracklist en een link naar de mixpagina op djcylow.com.

**Score:** 3

#### What makes this deploy extra special

Dave vindt via de homepagina elke mix die hij gemaakt heeft en opent er één met één klik.

**Score:** 3

#### Pull Request

Mixen-card op de homepagina met een card per mix

[PR #103](https://github.com/DKJ-Solutions/dkj-music-library/pull/103)

---

### DEPLOY: fix/release-note-audience-only · 20261027-134623Z

`scripts/repo-config.ps1` now answers `Get-ReleaseNoteSections` with `@('Audience')`, so `cut-release` stops drafting the two organisational sections. Without an answer it drafts all three. The shared default is DKJ-Solutions/dkj-claude-plugins#3584.

**Score:** 2

#### What makes this deploy extra special

The release notes now only say what changed for you. The v0.1.0 note no longer has *What it is worth* or *What was still open at this release*, and the next release notes will not get them either.

**Score:** 2

#### Pull Request

Keep the audience release note to what changed

[PR #102](https://github.com/DKJ-Solutions/dkj-music-library/pull/102)

---

### DEPLOY: feat/release-audience-notes · 20261027-133523Z

Every minor and major release cut now drafts an audience note under `dkj-policy/releases/audience/`,
the note the hub's release-notes page is built from. A patch still gets none.

**Score:** 2

#### What makes this deploy extra special

From the next minor on, each release comes with a note in plain words about what changed for you as a
user of the music library, readable on the release-notes page.

**Score:** 2

#### Pull Request

Draft an audience note at every minor and major release

[PR #101](https://github.com/DKJ-Solutions/dkj-music-library/pull/101)

---

