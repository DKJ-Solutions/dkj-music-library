# Changelog

## [Unreleased]

**18 / 20 minor entries** <!-- pending-tally -->

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

