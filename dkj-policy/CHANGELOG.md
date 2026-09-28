# Changelog

## [Unreleased]

**39 / 50 minor entries** <!-- pending-tally -->

### DEPLOY: feat/register-remember-filters · 20260928-182446Z

De filterstand van het trackregister wordt in localStorage bewaard en na mount hersteld; ongeldige opgeslagen waarden vallen per veld terug op de standaard.

**Score:** 2

#### What makes this deploy extra special

Het trackregister onthoudt je filters (zoekterm, year, dkj_bpm, dkj_genre, dkj_album, dkj_group, sortering, kolommen) na herladen of opnieuw openen, met een knop "Filters wissen".

**Score:** 3

#### Pull Request

Trackregister onthoudt de filterstand

[PR #56](https://github.com/DKJ-Solutions/dkj-music-library/pull/56)

---

### DEPLOY: feat/year-decade-filter · 20260928-141939Z

Het trackregister heeft een filter `year` met twee invulvelden, van en tot (beide inclusief), zodat je
bijvoorbeeld alleen nummers uit 2000–2009 ziet. Is er een grens ingevuld, dan vallen nummers zonder year af.

**Score:** 3

#### What makes this deploy extra special

Wie het register gebruikt, kan nu zelf een jaarbereik invullen en ziet alleen de nummers daarbinnen.

**Score:** 3

#### Pull Request

Trackregister filtert op een zelf ingevuld bereik van year

[PR #54](https://github.com/DKJ-Solutions/dkj-music-library/pull/54)

---

### DEPLOY: feat/dkj-genre-from-playlists · 20260928-140832Z

`dkj_genre` wordt nu bij elke sync (en bij `npm run library:assign-ids`) uit de playlistnamen afgeleid
zolang het leeg is, net als `dkj_bpm`: het genre als los woord in de naam (`128BPM EDM`, `Classic Pop`,
`ALT`, `OST`), en House Mix, Drum & Bass en D&B/DNB tellen als EDM. Het meest genoemde genre wint; bij
een gelijke stand blijft het leeg. De export is meteen gevuld: 10.503 van de 11.639 tracks (EDM 6.922,
POP 2.452, ALT 1.090, OST 39); 126 gelijke standen en 1.010 tracks zonder genre in hun playlists
blijven leeg.

**Score:** 3

#### What makes this deploy extra special

Het genrefilter in het trackregister werkt nu meteen voor bijna de hele bibliotheek, in plaats van dat
elk nummer met de hand een genre moet krijgen.

**Score:** 3

#### Pull Request

dkj_genre wordt uit de playlistnamen afgeleid

[PR #53](https://github.com/DKJ-Solutions/dkj-music-library/pull/53)

---

### DEPLOY: feat/dkj-genre-field · 20260928-135538Z

Het trackregister heeft een nieuwe kolom `dkj_genre` met de keuzes `EDM`, `POP`, `ALT` en `OST`, naast
`dkj_bpm`, met een eigen filter (inclusief "Leeg"). Het veld accepteert alleen die vier waarden bij een
import; het is nog bij alle tracks leeg en wordt niet afgeleid.

**Score:** 3

#### What makes this deploy extra special

Wie de bibliotheek gebruikt, kan tracks nu op genre indelen en in het register op genre filteren.

**Score:** 3

#### Pull Request

Trackregister krijgt dkj_genre (EDM, POP, ALT, OST)

[PR #52](https://github.com/DKJ-Solutions/dkj-music-library/pull/52)

---

### DEPLOY: feat/classic-pop-page · 20260928-132625Z

Nieuwe pagina `/spotify/classic-pop`: elk nummer uit een playlist met "Classic Pop" in de naam, één keer,
met de playlists waarin het staat (aantal plus de korte namen, de volledige in de tooltip) en het vroegste
moment waarop het is toegevoegd. Zoeken werkt ook op playlistnaam, dus "cyan" toont één kleur. De tabel
sorteert standaard op artiest. `readLibraryYears` woont nu in `playlistTableRows.ts` en wordt door deze
pagina en de Maple Classic-pagina gedeeld.

**Score:** 3

#### What makes this deploy extra special

Wie de app gebruikt, heeft nu voor het eerst één overzicht van de hele Classic Pop-verzameling over alle
kleur-playlists heen, en ziet per nummer waar het staat.

**Score:** 3

#### Pull Request

Classic Pop-pagina: alle nummers uit de Classic Pop-playlists in één tabel

[PR #51](https://github.com/DKJ-Solutions/dkj-music-library/pull/51)

---

### DEPLOY: feat/maple-classic-sync-button · 20260928-130409Z

De Maple Classic-pagina heeft nu dezelfde sync-knop als /spotify, met het tijdstip van de laatste
snapshot erboven. Na een sync ververst de pagina zichzelf, zodat een wijziging in Spotify meteen te zien is.

**Score:** 2

#### What makes this deploy extra special

Wie de Maple Classic-pagina bekijkt, kan de playlist verversen zonder eerst naar /spotify te gaan.

**Score:** 2

#### Pull Request

sync-knop op de Maple Classic-pagina

[PR #50](https://github.com/DKJ-Solutions/dkj-music-library/pull/50)

---

### DEPLOY: fix/same-origin-lan-host · 20260928-130050Z

De knoppen die iets opslaan (sync, afvinken, uitloggen) werken nu ook als je de app opent via het
LAN-adres, bijvoorbeeld http://192.168.178.123:3000. De beveiliging tegen verzoeken van andere sites
vergelijkt nu met het adres dat de browser werkelijk aansprak, in plaats van met `localhost`.

**Score:** 3

#### What makes this deploy extra special

Wie de app op een ander apparaat in huis opent, kan weer syncen in plaats van een foutmelding te krijgen.

**Score:** 3

#### Pull Request

sync en andere knoppen werken ook via het LAN-adres

[PR #49](https://github.com/DKJ-Solutions/dkj-music-library/pull/49)

---

### DEPLOY: feat/45-musicbrainz-release-year · 20260928-125351Z

Nieuw script `npm run library:release-years` zoekt bij MusicBrainz het jaar op waarin een nummer voor
het eerst uitkwam, met hooguit 1 verzoek per seconde, en bewaart dat lokaal in
`data/musicbrainz/release-years.json` (niet in git). De Maple Classic-pagina toont nu het vroegste
jaar van MusicBrainz, het Trackregister en het album, zodat een nummer op een verzamelalbum of
heruitgave niet meer het jaar van die uitgave krijgt. Nog lege jaren in de bibliotheek worden bij een
sync ook uit die cache gevuld.

**Score:** 3

#### What makes this deploy extra special

Op de Maple Classic-pagina kloppen de jaren van nummers op verzamelalbums en heruitgaven, zoals *I'm a
Believer* op *The Best of The Monkees*: 1966 in plaats van 2008.

**Score:** 3

#### Pull Request

Jaar van eerste uitgave via MusicBrainz, lokaal bewaard

[PR #48](https://github.com/DKJ-Solutions/dkj-music-library/pull/48)

---

### DEPLOY: feat/maple-classic-page · 20260928-120118Z

Nieuwe pagina `/spotify/maple-classic`: de playlist Maple Classic 2026 LAN als tabel met positie,
titel (link naar Spotify), artiest, album, jaar, duur, datum van toevoegen en wie het nummer toevoegde. Het jaar komt uit het Trackregister als het
nummer daarin staat, zodat een verzamelalbum het niet jonger maakt; anders is het het albumjaar van Spotify.
Je kunt zoeken op titel, artiest, album of toevoeger en sorteren op elke kolom. Bovenaan `/spotify` staat een link ernaartoe.

**Score:** 3

#### What makes this deploy extra special

De gebruiker van de app heeft een nieuwe pagina om deze LAN-playlist te bekijken en te doorzoeken.

**Score:** 3

#### Pull Request

eigen pagina met tabel voor de playlist Maple Classic 2026 LAN

[PR #46](https://github.com/DKJ-Solutions/dkj-music-library/pull/46)

---

### DEPLOY: feat/own-playlists-only · 20260928-101505Z

Alleen je eigen Spotify-playlists vullen de trackbibliotheek. Een gedeelde playlist, van een ander
account dat je volgt, staat nog wel op `/spotify`, maar levert geen nummers, artiesten of
`spotify_playlist`-regels meer. Een nummer dat ook in een eigen playlist staat, blijft. Wat alleen via
gedeelde playlists binnenkwam, is weggehaald: 821 nummers en 392 artiesten. Dat gebeurt bij elke sync
opnieuw.

**Score:** 3

#### What makes this deploy extra special

Het trackregister toont alleen nog Daves eigen collectie, zonder de ruim achthonderd nummers uit
playlists van anderen, zoals "trap" en "D&B".

**Score:** 3

#### Pull Request

Nummers uit gedeelde playlists horen niet in de bibliotheek

[PR #44](https://github.com/DKJ-Solutions/dkj-music-library/pull/44)

---

### DEPLOY: feat/year-column · 20260928-100654Z

Elk nummer heeft een veld `year`: het jaar waarin het uitkwam, volgens Spotify. Het trackregister
toont het in een eigen kolom, na de artiest, en je kunt erop sorteren en zoeken. Staat een nummer op
meer albums (single, album, compilatie), dan telt het vroegste jaar. Het lege veld `release_year` heet
nu `year`. De sync haalt de albumdatum mee, en bij de eerste sync na deze wijziging worden alle
playlists één keer volledig opgehaald.

**Score:** 3

#### What makes this deploy extra special

Dave ziet in het register meteen uit welk jaar elk nummer is, en kan de collectie op jaar sorteren.

**Score:** 3

#### Pull Request

Kolom year met het jaar van uitgave uit Spotify

[PR #42](https://github.com/DKJ-Solutions/dkj-music-library/pull/42)

---

### DEPLOY: fix/lan-dev-origin · 20260928-100234Z

De app werkt nu ook als je hem opent via het adres van de machine in het thuisnetwerk
(`192.168.x.x:3000`), en niet alleen via `127.0.0.1`. Tot nu toe blokkeerde Next.js daar de
dev-verbinding. De pagina kwam dan wel binnen, maar sorteren, de menu's en de filters in het
trackregister deden niets.

**Score:** 3

#### What makes this deploy extra special

Dave kan het register vanaf een ander apparaat in huis gebruiken.

**Score:** 3

#### Pull Request

Het trackregister werkt ook via het LAN-adres van de dev-server

[PR #43](https://github.com/DKJ-Solutions/dkj-music-library/pull/43)

---

### DEPLOY: fix/orphan-column-warning-once · 20260927-223242Z

De serverconsole herhaalt niet meer bij elke paginalading dat `dkj_artist_ids` en `dkj_playlists` in de database staan maar niet in `fields.ts`. Die melding komt nu één keer per kolom per serverproces. De kolommen zelf en hun data blijven staan, en het schemarapport voor scripts noemt ze nog steeds.

**Score:** 2

#### What makes this deploy extra special

N/A -- alleen de serverconsole van de eigen dev-server verandert.

**Score:** N/A

#### Pull Request

Waarschuwing over verweesde databasekolommen één keer per serverproces

[PR #41](https://github.com/DKJ-Solutions/dkj-music-library/pull/41)

---

### DEPLOY: feat/register-column-switch · 20260927-222544Z

Het trackregister heeft een kleine schakelaar `verborgen kolommen` in de filterbalk. Uit toont de gewone tabel, aan toont de vier kolommen die daar bewust uit zijn gelaten: `dkj_track_id`, `dkj_file`, `dkj_artist` en `dkj_artist_id` (als chip, of als menu met de namen bij meer artiesten). Zoeken, filters en bladeren werken in beide sets. Wisselen zet de sortering terug, omdat die bij een kop hoorde die dan verdwenen is.

**Score:** 3

#### What makes this deploy extra special

N/A -- een lokale app zonder abonnees; alleen de eigenaar gebruikt het register.

**Score:** N/A

#### Pull Request

Switch in het trackregister tussen de zichtbare en de verborgen kolommen

[PR #40](https://github.com/DKJ-Solutions/dkj-music-library/pull/40)

---

### DEPLOY: feat/sort-ignore-articles · 20260927-211617Z

Alfabetisch sorteren slaat een Engels lidwoord vooraan over: `The Beatles` staat bij de B, `A Tribe Called Quest` bij de T. Het geldt als los woord (`Abba`, `A-ha` en `Theory of a Deadman` blijven waar ze stonden) en een titel die alleen uit een lidwoord bestaat (`The The`) sorteert op zichzelf. Het zit in de gedeelde `compareText`, dus alle sorteerbare tabellen en het trackregister doen het gelijk.

**Score:** 3

#### What makes this deploy extra special

N/A -- een lokale app zonder abonnees; alleen de eigenaar ziet de sortering.

**Score:** N/A

#### Pull Request

Lidwoorden (A, An, The) tellen niet mee bij alfabetisch sorteren

[PR #39](https://github.com/DKJ-Solutions/dkj-music-library/pull/39)

---

### DEPLOY: feat/hide-artist-id-column · 20260927-211144Z

Het trackregister toont de kolom `dkj_artist_id` niet meer, net als eerder `dkj_track_id`. Zoeken op een
artiest-ID werkt nog steeds. De ruimte gaat naar `dkj_title` en `dkj_albumartiest`. De cel met de
artiest-chips en zijn menu, en de stijlen die alleen die cel gebruikte, zijn weg.

**Score:** 2

#### What makes this deploy extra special

Het register is rustiger: geen kolom met artiest-codes meer, en er is meer ruimte voor de titel en de artiest.

**Score:** 2

#### Pull Request

dkj_artist_id verborgen in het trackregister

[PR #38](https://github.com/DKJ-Solutions/dkj-music-library/pull/38)

---

### DEPLOY: feat/clean-dkj-title · 20260927-210735Z

`dkj_title` is nu alleen de titel. Generieke versie-aanduidingen en featuring gaan eruit:
*99 Biker Friends (Main Version) (Explicit)* wordt *99 Biker Friends*, *2 up in the Morning (Radio Mix)* wordt
*2 up in the Morning* en *Titanium (feat. Sia)* wordt *Titanium*. Een remix van een artiest blijft staan
(*Higher (David Penn Remix)*), net als wat bij de titel hoort (*(I Can't Get No) Satisfaction*). Een groep
tussen haakjes is generiek als elk woord erin een versiewoord of een jaartal is (`fileName.ts`).
Bestaande waarden in de oude afgeleide vorm zijn rechtgezet (1668 tracks) door `refreshTitles`, die ook in
elke sync meedraait. Een zelf ingevulde titel blijft staan.

**Score:** 3

#### What makes this deploy extra special

In het trackregister staat voortaan de kale titel, zonder Radio Mix, Remastered of featuring.

**Score:** 3

#### Pull Request

dkj_title zonder versie-aanduiding en featuring

[PR #37](https://github.com/DKJ-Solutions/dkj-music-library/pull/37)

---

### DEPLOY: feat/sort-ignore-punctuation · 20260927-210219Z

Bij het sorteren van A naar Z tellen leestekens niet meer mee. `'Til Tuesday` staat bij de T,
`...Baby One More Time` bij de B en `(Here I Am)` bij de H. Dat geldt voor het trackregister en de
tabellen op /spotify, die nu één vergelijkingsfunctie delen (`compareText` in `src/lib/sortRows.ts`).
Spaties tellen wel mee, zodat "De La Soul" niet samenvalt met "Dela".

**Score:** 2

#### What makes this deploy extra special

Wie op een titelkolom sorteert, vindt een titel die met een leesteken begint voortaan onder zijn eerste letter in plaats van bovenaan de lijst.

**Score:** 3

#### Pull Request

Leestekens tellen niet mee bij alfabetisch sorteren

[PR #36](https://github.com/DKJ-Solutions/dkj-music-library/pull/36)

---

### DEPLOY: feat/dkj-title-djcylow-mix · 20260927-205619Z

Het trackregister heeft twee nieuwe kolommen. `dkj_title` toont alleen de titel van het nummer, in de
vorm van `dkj_file` na de artiesten, en vervangt `dkj_file` in de tabel (zoeken op `dkj_file` kan nog).
De tabel staat in een smaller lettertype (Bahnschrift, iets smaller dan normaal), en de labels voor BPM, album en groep en de artiest-ID's hebben geen achtergrond meer, en de rijen zijn om en om gekleurd. Ook `dkj_artist` en `dkj_track_id` staan niet meer in de tabel. Het veld `dkj_artist_ids` heet nu
`dkj_artist_id`; een bestaande database en een oudere export zetten de oude naam zelf om. `djcylow_mix` noemt de mixen op djcylow.com waarin een track zit en linkt naar hun pagina, net zoals
`spotify_playlist` naar Spotify linkt. Een track zit in een mix als hij in de eigen MMC-playlist van
die mix staat; zonder mix-bron op de machine blijft het veld zoals het was.

**Score:** 3

#### What makes this deploy extra special

N/A: het register is een lokaal werkinstrument; geen abonnee ziet het.

**Score:** N/A

#### Pull Request

dkj_title en djcylow_mix in het trackregister, dkj_artist_id, drie kolommen verborgen

[PR #35](https://github.com/DKJ-Solutions/dkj-music-library/pull/35)

---

### DEPLOY: feat/album-candidates-dropdown · 20260927-202957Z

Staat `dkj_album` in het Trackregister leeg omdat de playlists van een track verschillende albums
noemen, dan toont de cel nu een menu "N albums" met die kandidaten, elk met zijn kleurstaal -- net als
de menu's bij playlists en groepen. Zoek je op een albumnaam, dan staat die treffer op de knop. Een
track met een ingevuld album toont gewoon dat album.

**Score:** 2

#### What makes this deploy extra special

N/A -- de Trackregister is een intern beheerscherm; geen abonnee ziet het.

**Score:** N/A

#### Pull Request

dkj_album toont een menu met de kandidaat-albums als de playlists verschillen

[PR #34](https://github.com/DKJ-Solutions/dkj-music-library/pull/34)

---

### DEPLOY: style/dropdown-over-table · 20260927-201346Z

De dropdownmenu's in het Trackregister (playlists, artiest-ID's, groepen) liggen nu altijd over de tabel
heen in plaats van afgekapt te worden door het scrollvak. Het menu staat in een portal met
`position: fixed` naast zijn knop, en klapt onderin beeld naar boven open.

**Score:** 3

#### What makes this deploy extra special

N/A -- de Trackregister is een intern beheerscherm; geen abonnee ziet het.

**Score:** N/A

#### Pull Request

Dropdownmenu's in het Trackregister vallen altijd over de tabel heen

[PR #33](https://github.com/DKJ-Solutions/dkj-music-library/pull/33)

---

### DEPLOY: style/trackregister-fits-screen · 20260927-201130Z

De tabel in het Trackregister wordt nooit hoger dan het venster: de pagina is zo hoog als het scherm en
het scrollvak van de tabel vult wat er overblijft, dus er is nog maar één verticale scrollbalk. Vorige en
Volgende staan daaronder altijd in beeld, dus je hoeft niet meer naar beneden te scrollen om te bladeren. De kop van elke
pagina met een masthead heeft onderaan minder ruimte: 12px in plaats van 28px.

**Score:** 2

#### What makes this deploy extra special

Wie door het register bladert, ziet de knoppen Vorige en Volgende altijd, zonder eerst naar beneden te
scrollen.

**Score:** 3

#### Pull Request

Trackregister past in het scherm, bladerknoppen altijd zichtbaar

[PR #31](https://github.com/DKJ-Solutions/dkj-music-library/pull/31)

---

### DEPLOY: feat/dedupe-live-variants · 20260927-192739Z

Een live-opname is geen eigen nummer meer. Hij krijgt het ID van zijn studioversie, en de rij houdt de
titel en de Spotify-gegevens van de studioversie. Zo is ACD01-02 nu "You Shook Me All Night Long" van
*Back In Black*, en is ACD01-38 vrijgekomen. Een nummer dat alleen live in je playlists staat, blijft
bestaan onder de titel zonder "- Live". Komt de studioversie later binnen, dan neemt die zijn plaats in.
De bestaande bibliotheek is één keer rechtgezet: 11 live-rijen zijn opgegaan in hun studioversie, en 51
titels zijn schoongemaakt. Live wordt alleen aan de titel herkend, dus "Live Forever" en het album
"I Live, I Learn" blijven buiten schot. Dit is een bewuste, eenmalige uitzondering op "een ID verandert
niet meer": de samengevoegde rij krijgt het laagste ID van de groep.

**Score:** 3

#### What makes this deploy extra special

Wie het Trackregister opent, ziet elk nummer nog maar één keer, en nergens meer een live-titel. Elf
dubbele rijen zijn weg.

**Score:** 3

#### Pull Request

live-varianten vallen samen met het studionummer

[PR #32](https://github.com/DKJ-Solutions/dkj-music-library/pull/32)

---

### DEPLOY: docs/25-rescore-tier-2 · 20260927-191125Z

The 22 changelog entries whose work the app's user can see are now scored for tier 2. The four that are
workflow or developer tooling stay N/A. The pending tally now reads `22 / 26 minor entries`, so the next
release earns a minor instead of a patch. Resolves #25.

**Score:** 2

#### What makes this deploy extra special

N/A. This changes how past entries are scored; the app itself does not change for its user.

**Score:** N/A

#### Pull Request

Changelog-entries opnieuw beoordeeld op tier 2 (de gebruiker van de app)

[PR #30](https://github.com/DKJ-Solutions/dkj-music-library/pull/30)

---

### DEPLOY: feat/trackregister-sort · 20260927-190735Z

Het trackregister sorteert op elke kolom: klik op een kolomkop voor oplopend, nog eens voor aflopend, en
een derde keer voor de oorspronkelijke volgorde. Lege cellen blijven onderaan, BPM en ID's sorteren
numeriek (96BPM vóór 112BPM). De beschrijving onder de kop "DKJ Trackregister" is weg, en `.masthead` heeft geen `margin-bottom` meer (op alle pagina's met die kop).

**Score:** 3

#### What makes this deploy extra special

De gebruiker sorteert het register voortaan met één klik op een kolomkop; dat merkt hij de eerste keer dat hij het register opent.

**Score:** 3

#### Pull Request

Trackregister sorteert op elke kolom via de kopregel

[PR #29](https://github.com/DKJ-Solutions/dkj-music-library/pull/29)

---

### DEPLOY: fix/1-stale-spotify-write-comment · 20260927-190116Z

The comments in the mix-tag route and in the Spotify scope configuration no longer claim that the
playlist description is the only thing the hub writes to Spotify; they name both writers, the
description (mix-tag) and the name (playlist-name). Resolves #1.

Prevents a later reader from trusting the stale claim when judging what the Spotify scopes are used for.

**Score:** 1

#### What makes this deploy extra special

A subscriber of a service never sees a source comment.

**Score:** N/A

#### Pull Request

Verouderd commentaar: mix-tag heet nog de enige Spotify-schrijfroute

[PR #28](https://github.com/DKJ-Solutions/dkj-music-library/pull/28)

---

### DEPLOY: feat/trackregister-page · 20260927-185715Z

#### What does the change on this branch deploy to main?

##### Tier 0

Het Trackregister is nu een pagina in de app: `/spotify/trackregister`, met een link bovenaan `/spotify`.
Je ziet elk nummer met `dkj_track_id`, `dkj_artist`, `dkj_albumartiest`, `dkj_artist_ids`, `dkj_bpm`,
`dkj_album` en `dkj_file`, zoekt zonder op accenten te letten en filtert op `dkj_bpm` en `dkj_album` (ook op "leeg"). De
pagina leest de bibliotheek uit de export in git, dus hij werkt op elke kloon, zonder Spotify-login, sync
of Claude-account.

**Score:** 4

##### Tier 1

Een eigen werkpagina; management merkt hier niets van.

**Score:** N/A

##### Tier 2

De gebruiker krijgt een eigen pagina om de hele collectie te doorzoeken en te filteren, zonder login of sync; die pagina wordt waar hij dagelijks in werkt.

**Score:** 4

#### Pull Request

Het Trackregister als pagina in de app (/spotify/trackregister)

[PR #15](https://github.com/DKJ-Solutions/dkj-music-library/pull/15)

---

### DEPLOY: feat/dkj-group-from-worlds · 20260927-185319Z

#### What does the change on this branch deploy to main?

##### Tier 0

`dkj_group` is nu een lijst en wordt gevuld uit de werelden van de Spotify-playlists van een track: MMC,
DJ CYLOW en Prive, en een playlist met een beschrijving telt sowieso als MMC. Een track in meer werelden
krijgt meer groepen. Alle 12.471 tracks zijn gevuld: 9.662 alleen Prive, 409 alleen MMC, 312 alleen DJ
CYLOW en 2.088 met meer dan één groep. `Overige` zet je zelf.

**Score:** 3

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

##### Tier 2

Elke track in het register heeft nu een groep, afgeleid uit de playlists; wie de collectie opent, ziet het veld meteen gevuld in plaats van leeg.

**Score:** 3

#### Pull Request

dkj_group wordt een lijst en wordt afgeleid uit de werelden van de playlists

[PR #27](https://github.com/DKJ-Solutions/dkj-music-library/pull/27)

---

### DEPLOY: feat/release-audience-tier · 20260927-185039Z

Nieuwe changelog-entries vragen voortaan alleen naar tier 0 en naar tier 2 (de gebruiker van de app),
net als in de bronrepo. De vraag naar tier 1 (management of opdrachtgever) vervalt, omdat die hier
nooit van toepassing is.

**Score:** 2

#### What makes this deploy extra special

N/A. Dit verandert alleen hoe entries gevraagd worden; in de app merkt de gebruiker niets.

**Score:** N/A

#### Pull Request

Deze repo publiceert voor tier 2

[PR #26](https://github.com/DKJ-Solutions/dkj-music-library/pull/26)

---

### DEPLOY: feat/dkj-group-field · 20260927-184320Z

#### What does the change on this branch deploy to main?

##### Tier 0

Het Trackregister krijgt de kolom `dkj_group`, met als enige toegestane waarden MMC, DJ CYLOW, Prive en
Overige. Een andere waarde breekt de import af; hoofdletters en spaties tellen niet mee. Het veld staat
nog bij elke track leeg.

**Score:** 2

##### Tier 1

Intern datamodel; management merkt hier niets van.

**Score:** N/A

##### Tier 2

Een nieuwe kolom in het register, nog leeg; de gebruiker merkt het pas als iemand hem erop wijst.

**Score:** 2

#### Pull Request

Trackregister krijgt de kolom dkj_group (MMC, DJ CYLOW, Prive, Overige)

[PR #24](https://github.com/DKJ-Solutions/dkj-music-library/pull/24)

---

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

7.454 tracks hebben zonder handwerk een BPM gekregen; de gebruiker ziet dat zodra hij het veld opent.

**Score:** 3

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

Alleen de naam van een veld in de export verandert; een importbestand met de oude naam werkt nog, dus de gebruiker hoeft niets te doen.

**Score:** 1

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

8.257 tracks hebben zonder handwerk een album gekregen; de gebruiker ziet dat zodra hij het veld opent.

**Score:** 3

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

Een veld dat na een `git pull` leeg bleef bij alle 12.471 tracks is nu gevuld; de gebruiker merkt het de eerste keer dat hij dat veld bekijkt.

**Score:** 3

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

Bij elke track staat nu in welke playlists hij zit, met link; de gebruiker ziet dat zodra hij een track opzoekt.

**Score:** 3

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

Elke track heeft nu de bestandsnaam zoals op de desktop; de gebruiker ziet dat zodra hij een track opzoekt.

**Score:** 3

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

Bij 209 tracks staat nu een andere artiest; klein, en pas zichtbaar bij die tracks.

**Score:** 2

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

Bij 1.214 tracks staat nu de remixer als artiest, zoals de gebruiker het zelf ordent; zichtbaar zodra hij die tracks opzoekt.

**Score:** 3

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

Elke track toont nu al zijn artiesten in één veld; de gebruiker ziet dat zodra hij een track opzoekt.

**Score:** 3

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

Drie nieuwe velden in het register, waarvan `dkj_artist` meteen gevuld bij elke track; de gebruiker ziet dat zodra hij de collectie opent.

**Score:** 3

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

De 4.692 tracks met meer dan één artiest hebben een nieuw ID; de gebruiker ziet dat zodra hij er een opzoekt.

**Score:** 3

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

Elk track-ID is veranderd van `T000001` naar een leesbaar ID per artiest; de gebruiker merkt het bij de eerste track die hij opzoekt.

**Score:** 4

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

Alleen de naam van het ID-veld verandert; oude exports en importbestanden werken nog, dus de gebruiker hoeft niets te doen.

**Score:** 1

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

Elke artiest heeft nu een eigen ID en elke track de ID's van zijn artiesten; zichtbaar zodra de gebruiker een track opzoekt.

**Score:** 3

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

De collectie staat op elke machine waar de repo gekloond wordt, zonder eerst te syncen; de gebruiker merkt het de eerste keer dat hij op een andere machine werkt.

**Score:** 3

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

Elke track in de collectie heeft nu een eigen, stabiel ID; zichtbaar zodra de gebruiker de collectie opent.

**Score:** 3

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

De collectie heeft voor het eerst een eigen database met eigen velden naast de Spotify-gegevens; daar werkt de gebruiker voortaan in.

**Score:** 4

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

Een extra tegel op `/spotify` en het dashboard; klein, en zichtbaar als je erop let.

**Score:** 2

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

