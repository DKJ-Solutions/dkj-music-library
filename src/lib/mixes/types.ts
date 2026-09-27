// De mix-metadata van de DJ Cylow-website als tweede bron naast de Spotify-snapshot (zie het
// dossier life-hub (privé): Brains/plutchik-brain/feiten/werk/dj-cylow/spotify-playlist-manager/CORTEX.md, §"De
// mix-JSON's van de DJ Cylow-website <-> de MMC-playlists"). Dave's uitgangspunt: de MMC-playlists
// op Spotify zijn een WEERSPIEGELING van deze data -- bij een nieuwe mix-upload landt de tracklist
// ook in de MMC-map. Deze bron is dus leidend; de playlist is de spiegel.
//
// Twee lagen, net als bij de Spotify-kant (types.ts <-> parsePlaylistName.ts):
//   - `RawMixEntry`  -- het JSON-bestand zoals het op schijf staat, 1-op-1 (de volledige
//     veldspecificatie woont in src/data/mixes/README.md, Dave's eigen bron van waarheid).
//   - `Mix`          -- de genormaliseerde vorm die de app gebruikt: dezelfde dimensie-namen als
//     ParsedPlaylistName (color/density/gender/volume) zodat de twee bronnen zonder tussenlaag
//     naast elkaar te leggen zijn.
import type { PlutchikColor } from "@/lib/spotify/plutchikColors";

/** Eén track uit een mix-tracklist. `time` is "HH:MM:SS" (nieuw) of "MM:SS" (legacy). */
export interface RawMixTrack {
  time: string;
  track: string;
}

/** Eén entry uit een `[power]-[color].json`. Alleen de velden die de app gebruikt zijn hier
 *  getypeerd; de bestanden dragen meer (SEO-velden, afbeeldingspaden, permalink) dat de hub niet
 *  nodig heeft. Alles optioneel: legacy-entries laten velden leeg of weg. */
export interface RawMixEntry {
  id?: string;
  title?: string;
  /** De sprekende sleutel die bij deze mix hoort -- `mmc_edm_128bpm_light_f_cyan_20251108`, sinds
   *  2026-07-26 in de bron. Wordt genormaliseerd naar `spotifyId` hieronder; de vormcontrole staat in
   *  spotifyId.ts. */
  id_spotify?: string;
  /** De exacte playlistnaam die bij deze mix hoort -- sinds 2026-07-26 in de bron (zie het dossier,
   *  §"De JSON draagt sinds 26 juli de Spotify-kant zelf"). Wordt genormaliseerd naar `spotifyTitle`
   *  hieronder; de bewerkingen staan in spotifyTitle.ts. */
  title_spotify?: string;
  genre?: string;
  subgenre?: string;
  color?: string;
  power?: string;
  frequency?: string;
  volume?: string;
  date?: string;
  audioSrc?: string;
  permalink?: string;
  featured?: boolean;
  /** `true` = preview-stub of concept: hoort niet op de site en dus ook niet in de koppeling. */
  ignore?: boolean;
  top_artists?: string[];
  tracklist?: RawMixTrack[];
}

/** Een genormaliseerde mix. De dimensie-velden dragen bewust dezelfde namen/waarden als
 *  ParsedPlaylistName (spotify/parsePlaylistName.ts), zodat vergelijken triviaal blijft. */
export interface Mix {
  /** Het `id`-veld uit de JSON (`YYYYMMDD` voor echte mixen) -- de sleutel binnen deze bron.
   *  LET OP: dit is GEEN sleutel die de Spotify-kant kent; die koppeling loopt via de tracks. */
  id: string;
  /** Bestandsnaam waar de entry uit komt, bv. "light-red.json" -- handig bij het corrigeren. */
  file: string;
  /** `id_spotify` uit de JSON: dezelfde mix, maar dan als sprekende sleutel
   *  (`mmc_edm_128bpm_light_f_cyan_20251108`). `null` = de bron levert er geen, of de waarde heeft niet
   *  de afgesproken vorm -- zie normalizeSpotifyId in spotifyId.ts.
   *
   *  LET OP het verschil met `id`: dat zijn de acht cijfers, en dat blijft overal in deze app DE sleutel
   *  waarop gekoppeld wordt. Dit veld is wat er sinds 2026-08-11 in de PLAYLISTBESCHRIJVING komt te
   *  staan (Dave's keuze), en het draagt diezelfde acht cijfers aan zijn staart -- dus de koppeling
   *  verandert er niet door, alleen de vorm waarin ze op Spotify staat. */
  spotifyId: string | null;
  title: string;
  /** De playlistnaam die deze mix op Spotify hoort te dragen -- `title_spotify` uit de JSON, met het
   *  datumstaartje eraf (zie normalizeSpotifyTitle in spotifyTitle.ts). `null` = de bron levert er geen,
   *  en dan valt er niets te spiegelen.
   *
   *  LET OP het verschil met `title`: dat is de naam op de WEBSITE ("Red Tech House Mix · Vol. 6"), dit
   *  is de naam op SPOTIFY ("EDM 128BPM 🔴 Red Light (m) 🔴 Vol. 6"). Twee verschillende velden in de
   *  bron, twee verschillende plekken waar ze verschijnen. */
  spotifyTitle: string | null;
  /** De URL-slug van de mixpagina op djcylow.com (`/luister/mix/<slug>`), afgeleid uit `permalink` zoals
   *  de website het zelf doet (mixSlug in djcylow-react, src/data/mixes/all.ts). `null` = geen permalink,
   *  en dan heeft de mix geen pagina. */
  slug: string | null;
  genre: string | null;
  subgenre: string | null;
  color: PlutchikColor | null;
  /** `power` in de JSON; hier `density`, zoals de playlist-parser het noemt. */
  density: "Full" | "Light" | null;
  /** `frequency` "(f)"/"(m)" in de JSON; hier de kale letter, zoals de playlist-parser het levert. */
  gender: "f" | "m" | null;
  /** Het nummer uit "Vol. N", of null. Let op: deze nummering loopt NIET gelijk met die op
   *  Spotify (de JSON nummert per genre-familie, Spotify doorlopend) -- zie het dossier. */
  volume: number | null;
  /** ISO-datum "YYYY-MM-DD" uit `date`, of null bij legacy-entries. */
  date: string | null;
  /** De ECHTE BPM, uit de `audioSrc`/`permalink`-bestandsnaam (bv. "...128BPM..."). Waar dit
   *  gevuld is, is het een feit -- tegenover de gok van spotify/classifyBpm.ts. */
  bpm: number | null;
  topArtists: string[];
  /** De tracklist als kale "Artist - Title"-regels, in mix-volgorde. */
  tracks: string[];
}
