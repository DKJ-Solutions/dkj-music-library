// Wereld-classifier: raadt uit de playlistnaam + de al-geparsede naam-dimensies
// (parsePlaylistName.ts) welke van Dave's drie top-niveau Spotify-"werelden" een playlist hoort
// te zijn -- een nabootsing van zijn eigen folder-indeling in de Spotify-app zelf. De Web API
// geeft die folder-indeling NIET terug (bekend folder-probleem, zie het dossier
// life-hub (privé): Brains/plutchik-brain/feiten/werk/dj-cylow/spotify-playlist-manager/CORTEX.md, §4) -- dit is de
// beste gok uit de naam. GEEN playlist krijgt hier "geen wereld": de laatste regel is een
// catch-all. Waar het misraadt, corrigeert Dave het handmatig via worldStore.ts (zijn expliciete
// akkoord: "begin maar met raden, dan corrigeer ik later") -- die correctie overleeft een hersync.
//
// Bewust een PURE functie, los van enrichedPlaylists.ts (geen fs hier) -- makkelijk te testen en
// makkelijk voor Dave om bij te stellen als een regel een keer misraadt.
//
// Prioriteitsvolgorde (in deze volgorde, elke regel gedocumenteerd -- zie ook classifyWorld.test.ts
// voor concrete voorbeelden uit de echte snapshot). NIEUWSTE BIJSTELLING (2026-07-23, tweede ronde):
// Dave heeft de app na de vorige bijstelling écht gebruikt en scherpt MMC verder aan -- MMC is voor
// hem voortaan UITSLUITEND zijn genummerde mixen (House Mix / Drum & Bass (Mix), met een
// Vol.-nummer), niets anders. Alles wat nu nog "kaal" (geen Vol) in de kleurstructuur zit -- de
// EDM-emmers, Music Mood, D&D -- hoort voor hem in Privé, óók al is het duidelijk kleur-gestructureerd.
// Zie het dossier life-hub (privé): Brains/plutchik-brain/feiten/werk/dj-cylow/spotify-playlist-manager/CORTEX.md voor
// de aanleiding.
//   1. Een expliciete DJ Cylow/Feestzaal-marker in de naam wint ALTIJD, ongeacht kleur, typeLabel
//      of eigenaar -- dit is DJ-werk, ook als de naam toevallig ook een MMC-kleurstructuur volgt
//      (bv. "Classic Pop | DJ Cylow") of een gevolgde, niet-eigen playlist is (bv. "DJ CYLOW
//      PLAYLIST", playlist 10 in de snapshot -- gedeeld door iemand anders, geen Dave-owned
//      playlist, maar onmiskenbaar DJ Cylow-materiaal).
//   2. NIEUW (tweede ronde): twee expliciete, met naam genoemde MMC-uitzonderingen (Dave noemt ze
//      met naam, zie MMC_NAME_EXCEPTION_PATTERN hieronder) -- moeten VOOR alle Privé-forcerende
//      regels komen, want beide namen bevatten toevallig ook een woord dat verderop een
//      Privé-regel zou triggeren (bv. "Music Mood" in beide namen). "Happy Lofi Beats | Cyan Music
//      Mood (f) Vol. 1" is bovendien een gevolgde, NIET-eigen playlist (owner = "Cyan Music Mood",
//      niet Dave) -- zonder deze expliciete override zou-ie nooit de eigenaar-check van regel 7
//      hieronder halen en dus sowieso in Privé belanden.
//   3. Dave's eigen, met naam genoemde privé-lijsten en privé-gelegenheden gaan naar Privé, OOK als
//      ze kleur-gecodeerd zijn of een typeLabel dragen (bv. "Purple Music Mood Full (f) | <naam>") --
//      deze override moet vóór regel 7 komen, anders zouden ze als MMC geraden worden. De namen zelf
//      staan NIET in deze repo (die is publiek): ze komen als `priveNamePatterns` uit het lokale,
//      git-ignored data/spotify/private-rules.json (zie privateRules.ts), en worden als argument
//      meegegeven zodat deze functie puur blijft. Tot 2026-09-27 waren dit twee aparte regels (vaste
//      lijsten, en gelegenheden als regel 5); ze geven allebei Privé, net als regel 4, dus de volgorde
//      tussen die drie telt niet.
//   4. Een herkende typeLabel uit PRIVE_TYPE_LABELS (Top 100, Classic Pop, ALT, OST) is Privé --
//      ook mét kleur (bv. "Cyan Full (f) 🧊 Top 100" droeg eerder Cyan en werd MMC; Dave wil deze
//      vier families nu in Privé). Sinds de tweede bijstelling feitelijk ook al afgedekt door het
//      MMC-allowlist-effect van regel 7 (deze vier typeLabels zitten daar toch niet in), maar
//      bewust behouden als expliciete, voor zichzelf sprekende regel -- zie ook de toelichting bij
//      regel 7 hieronder.
//   5. (Opgegaan in regel 3.)
//   6. ONZEKER (artiest-heuristiek -- zie de opdracht en het transparantie-rapport in de
//      PR-omschrijving): een eigen playlist waarvan de vrije pipe-staart (`parsed.contextTag`) NIET
//      een bekende niet-artiest-marker bevat (zie KNOWN_NON_ARTIST_CONTEXT_PATTERN) wordt
//      behandeld als "artiestnaam in de titel" -> Privé. Dit is een gok zonder vast patroon --
//      bv. "Red Full (m) | Delta Heavy" (Delta Heavy = artiest) verhuist hierdoor van MMC naar
//      Privé, terwijl "NEW Deep House Mix | 112BPM | Green Music Mood (f) Vol. 1" (contextTag
//      "NEW Deep | Music Mood" -- een restant van een NIET-gewonnen typeLabel, geen artiest) dankzij
//      de marker-check terecht MMC blijft (via regel 7 hieronder -- hij heeft toevallig ook al een
//      Vol.-nummer, dus zou ook zonder de expliciete regel-2-uitzondering al MMC zijn geworden).
//   7. NIEUW/STRIKT (tweede bijstelling): een eigen (Dave-owned) playlist is alleen nog MMC als hij
//      ÉÉN van de genummerde-mix-families draagt (House Mix, de gecombineerde "Drum & Bass
//      (Mix)"-familie uit parsePlaylistName.ts, of -- sinds 2026-08-11, en dan alleen mét een kleur in
//      de naam -- "EDM-emmer", de vorm die `title_spotify` uit de mix-bron oplevert; zie
//      MMC_TYPE_LABELS) ÉN een Vol.-nummer heeft
//      (parsed.volume !== null -- "Vol. X" telt ook mee: dat is de WERKBAK van een nog niet gemaakte
//      mix, zie de doc bij `volume` in parsePlaylistName.ts, en die hoort net zo goed bij MMC als de
//      afgeronde, genummerde mixen). Dit is een strikte
//      allowlist, GEEN "kleur ÓF typeLabel"-gok meer zoals in de vorige versie: een kale emmer
//      zonder herkend mix-type-typeLabel (EDM-emmer, Music Mood, D&D, of gewoon een kleur zonder
//      typeLabel) matcht deze regel per definitie niet, en een mix-type MET typeLabel maar ZONDER
//      Vol. (bv. "Drum & Bass Mix | 176BPM" zonder volgnummer) evenmin -- beide vallen dus door naar
//      de Privé-catch-all (regel 8). Geen aparte "D&D -> Privé"/"EDM-emmer -> Privé"/"Music Mood ->
//      Privé"-regels nodig: de allowlist zelf sluit ze al uit (zelfde stijl als de
//      DJCYLOW_NAME_PATTERN-toelichting hierboven -- een aparte regel die nooit een ander resultaat
//      zou opleveren dan de catch-all sowieso al geeft, is dode code die geen test als beslissende
//      conditie kan dekken).
//   8. Alles wat overblijft -- gevolgde/niet-eigen playlists zonder marker, een eigen playlist
//      zonder herkend patroon, een mix-type zonder Vol., of een kale EDM-emmer/Music Mood/D&D-naam
//      -- is Privé, de "rest"-wereld.
import type { ParsedPlaylistName } from "./parsePlaylistName";

export const SPOTIFY_WORLDS = ["mmc", "djcylow", "prive"] as const;
export type SpotifyWorld = (typeof SPOTIFY_WORLDS)[number];

/** Vaste presentatie-metadata per wereld -- gedeeld door de nav-tegels op /spotify, de
 *  wereld-sub-routes en het correctie-dropdownje in PlaylistManager, zodat label/emoji/route op
 *  precies één plek staan. */
export const WORLD_META: Record<SpotifyWorld, { label: string; emoji: string; description: string; href: string }> = {
  mmc: {
    label: "MMC",
    emoji: "🎨",
    description:
      "Music Mood Colours -- uitsluitend Dave's genummerde mixen: House Mix en Drum & Bass (Mix), altijd met een Vol.-nummer.",
    href: "/spotify/musicmoodcolours",
  },
  djcylow: {
    label: "DJ Cylow",
    emoji: "🎧",
    description: "Het DJ-werk: Feestzaal-fases, gigs en de losse DJ Cylow-compilaties.",
    href: "/spotify/djcylow",
  },
  prive: {
    label: "Privé",
    emoji: "🏠",
    description:
      "De rest: losse persoonlijke lijsten, de kale EDM-emmers, Music Mood, D&D, en playlists die je alleen volgt.",
    href: "/spotify/prive",
  },
};

/** Wat de classifier nodig heeft -- een smalle projectie i.p.v. het volledige EnrichedPlaylist,
 *  zodat dit bestand niet van enrichedPlaylists.ts hoeft te importeren (dat bestand roept
 *  classifyWorld juist zelf aan -- een import de andere kant op zou een cirkel zijn). Sinds de
 *  artiest-heuristiek (regel 6) ook `contextTag` nodig -- de vrije pipe-staart. */
export interface ClassifiableWorldPlaylist {
  name: string;
  ownerBucket: "dave" | "other";
  parsed: Pick<ParsedPlaylistName, "color" | "typeLabel" | "contextTag" | "volume">;
}

// Regel 1. "Phase 1A, Feestzaal (2026)" matcht via /feestzaal/i in de naam zelf. Bewust GEEN
// aanvullende `parsed.typeLabel === "Phase/Feestzaal"`-check hiernaast: PHASE_FEESTZAAL in
// parsePlaylistName.ts herkent het typeLabel zelf ook via /\bfeestzaal\b/i, dus zo'n check zou
// nooit een ander resultaat opleveren dan deze regex al geeft -- alleen dode code die geen
// test kan dekken als beslissende conditie. Verandert de spelling die parsePlaylistName.ts
// herkent ooit (bv. een variant zonder het woord "feestzaal"), breid dan dit patroon zelf uit.
const DJCYLOW_NAME_PATTERN = /cylow|feestzaal/i;

// Regel 2 (nieuw, tweede bijstelling 2026-07-23). Dave noemt deze twee playlists met naam als
// bewuste MMC-uitzonderingen -- ondanks dat ze geen (of, in de huidige snapshot, toevallig wel
// een) Vol.-nummer dragen. Ruime bevat-check, zelfde reden als de andere expliciete-naam-patronen
// in dit bestand: makkelijk voor Dave om de kern van de naam te herkennen/aan te passen zonder een
// overdreven strak patroon te moeten ontcijferen.
const MMC_NAME_EXCEPTION_PATTERN = /happy\s+lofi\s+beats|new\s+deep\s+house\s+mix/i;

/** Regel 3: de privé-namen uit de lokale config (privateRules.ts), al gecompileerd. Een lege lijst
 *  betekent dat regel 3 nooit iets vangt. */
export interface WorldRules {
  priveNamePatterns: readonly RegExp[];
}

export const NO_WORLD_RULES: WorldRules = { priveNamePatterns: [] };

// Regel 4. De typeLabel-families die Dave liever in Privé ziet, ondanks dat ze verder gewoon de
// MMC-kleurstructuur volgen. Een expliciete Set, makkelijk uit te breiden -- gebruik hier exact de
// labels uit KNOWN_TYPE_LABELS (parsePlaylistName.ts).
const PRIVE_TYPE_LABELS: ReadonlySet<string> = new Set(["Top 100", "Classic Pop", "ALT", "OST"]);

// Regel 6 (ONZEKER -- zie de opdracht/het prioriteits-commentaar hierboven). Bekende NIET-artiest-
// fragmenten die in een contextTag terecht kunnen komen zonder dat de tag een artiestnaam is:
//   - de typeLabel-familiewoorden zelf (identieke patronen als de TYPE_MATCHERS in
//     parsePlaylistName.ts) -- nodig voor het geval een NIET-winnende familie toch als restjes-tekst
//     in de contextTag eindigt, omdat de eerst-winnende familie (TYPE_MATCHERS-volgorde) een ander
//     woord was (bv. "NEW Deep House Mix | ... | Green Music Mood (f) Vol. 1": "House Mix" wint als
//     typeLabel, "Music Mood" blijft als contextTag-restjestekst staan -- dat is geen artiest);
//   - de al elders afgehandelde markers (DJ Cylow/Feestzaal, de twee MMC-naam-uitzonderingen) --
//     ter volledigheid ook hier uitgesloten, ook al hebben regels 1-2 die al afgevangen vóór we
//     hier komen. De privé-namen van regel 3 staan hier niet: die geven al Privé vóór deze regel,
//     en deze regel geeft zelf ook Privé, dus ze hier noemen zou niets veranderen.
// Dave zal dit lijstje willen bijstellen zodra een fout-positief/-negatief opduikt -- daarom een
// kale, goed becommentarieerde regex i.p.v. verspreide losse checks.
const KNOWN_NON_ARTIST_CONTEXT_PATTERN =
  /top\s*100|classic\s*pop|\balt\b|\bost\b|house\s*mix|drum\s*&\s*bass|music\s*mood|d&d|feestzaal|cylow|happy\s+lofi\s+beats|new\s+deep\s+house\s+mix/i;

// Regel 7 (nieuw/strikt, tweede bijstelling). Alleen deze typeLabels tellen als een "genummerde mix"
// -- zie parsePlaylistName.ts's TYPE_MATCHERS: "Drum & Bass (Mix)" is daar al de samengevoegde familie
// voor zowel "Drum & Bass" als "Drum & Bass Mix" (de parser onderscheidt ze niet verder), dus die ene
// labelstring dekt beide.
//
// "EDM-emmer" IS ER OP 2026-08-11 BIJ GEKOMEN, en dat is een gevoeliger toevoeging dan de andere twee --
// vandaar de extra eis in de regel zelf (hieronder) dat er een KLEUR in de naam staat. De aanleiding:
// Dave neemt de playlistnamen letterlijk over uit `title_spotify` in de mix-bron, en die vorm noemt het
// genre niet meer bij naam:
//
//     was:  "House Mix 🟡 Yellow Full (m) 🟡 Vol. 1"        -> typeLabel "House Mix"
//     nu:   "EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1"        -> typeLabel "EDM-emmer"
//
// Zonder deze toevoeging zou 47 van de 48 gekoppelde MMC-playlists bij het hernoemen naar Privé zakken
// en de hele MMC-laag (de wereld-route, de vier BPM-sub-routes en de brug) vrijwel leeglopen. Gemeten
// tegen de snapshot van 2026-08-11: exact 47 van 48. Eén playlist was al met de hand hernoemd en stond
// dus al ten onrechte in Privé -- die haalt deze regel terug.
//
// WAAROM DE KALE EMMERS ER NIET DOOR GLIPPEN. De twee eisen samen -- een kleur ÉN een Vol.-nummer --
// zijn precies wat een genummerde mix onderscheidt van de emmers die Dave in Privé wil: een kale
// EDM-emmer draagt geen Vol.-nummer (dat is wat hem een emmer maakt) en de BPM-tier-emmers geen kleur.
// Gemeten over alle 388 playlists in de snapshot: één treffer, en dat is de al-hernoemde MMC-playlist
// hierboven. Nul Privé-playlists worden meegesleept.
const MMC_TYPE_LABELS: ReadonlySet<string> = new Set(["House Mix", "Drum & Bass (Mix)", "EDM-emmer"]);

/** Vraagt de MMC-allowlist voor dit typeLabel ook een kleur in de naam? Alleen "EDM-emmer" doet dat --
 *  zie de toelichting bij MMC_TYPE_LABELS hierboven. De twee genre-families zijn uit zichzelf al
 *  specifiek genoeg; "EDM" is dat niet, want dat staat óók op elke emmer. */
const MMC_TYPE_LABELS_MET_KLEUREIS: ReadonlySet<string> = new Set(["EDM-emmer"]);

/** Bevat deze restjes-tekst iets dat een artiestnaam KAN zijn -- oftewel: minstens één letter?
 *
 *  Regel 6 leest een onbekende pipe-staart als "er staat een artiestnaam in de titel" en stuurt de
 *  playlist naar Privé. Dat is een bruikbare gok voor woorden, maar een rest die alleen uit cijfers,
 *  emoji's en interpunctie bestaat is nooit een artiest -- en zo'n rest is precies wat de naamvorm uit de
 *  mix-bron kan achterlaten:
 *
 *    "EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1 🟡 20260303"  -> rest "20260303"   (het datumstaartje)
 *    "EDM 128BPM 💠 Cyan Light (f) 💠 Vol. 5"               -> rest "💠 💠"      (een emoji die de
 *                                                                                parser niet als kleur kent)
 *
 *  Zonder deze horde zakt zo'n playlist naar Privé met "de artiest heet 20260303" als impliciete
 *  onderbouwing. Gevonden 2026-08-11 door de test die de hernoemde vorm vastlegt.
 *
 *  Bewust een horde vóór de heuristiek en geen extra uitzondering in KNOWN_NON_ARTIST_CONTEXT_PATTERN:
 *  dat patroon is een lijst van dingen die we KENNEN, en dit is een eigenschap van de tekst zelf. */
function draagtWoorden(contextTag: string): boolean {
  return /\p{Letter}/u.test(contextTag);
}

export function classifyWorld(
  playlist: ClassifiableWorldPlaylist,
  rules: WorldRules = NO_WORLD_RULES
): SpotifyWorld {
  const { name, ownerBucket, parsed } = playlist;

  if (DJCYLOW_NAME_PATTERN.test(name)) {
    return "djcylow";
  }

  if (MMC_NAME_EXCEPTION_PATTERN.test(name)) {
    return "mmc";
  }

  if (rules.priveNamePatterns.some((pattern) => pattern.test(name))) {
    return "prive";
  }

  if (parsed.typeLabel !== null && PRIVE_TYPE_LABELS.has(parsed.typeLabel)) {
    return "prive";
  }

  if (
    ownerBucket === "dave" &&
    parsed.contextTag !== null &&
    draagtWoorden(parsed.contextTag) &&
    !KNOWN_NON_ARTIST_CONTEXT_PATTERN.test(parsed.contextTag)
  ) {
    return "prive";
  }

  if (
    ownerBucket === "dave" &&
    parsed.typeLabel !== null &&
    MMC_TYPE_LABELS.has(parsed.typeLabel) &&
    parsed.volume !== null &&
    (!MMC_TYPE_LABELS_MET_KLEUREIS.has(parsed.typeLabel) || parsed.color !== null)
  ) {
    return "mmc";
  }

  return "prive";
}
