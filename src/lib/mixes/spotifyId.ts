// HET MIX-ID ALS SPREKENDE SLEUTEL: `id_spotify` uit de mix-bron (Dave, 2026-08-11).
//
// De mix-JSON's dragen sinds 2026-07-26 naast `id` (`20251108`) ook `id_spotify`
// (`mmc_edm_128bpm_light_f_cyan_20251108`) -- dezelfde mix, maar met de dimensies in de sleutel zelf.
// Dave's opdracht: die sleutel hoort in de playlist te staan, en wel op de plek waar tot nu toe het kale
// mix-ID stond -- het laatste segment van de beschrijving (zie mixDescription.ts).
//
// WAAROM DIT DE KOPPELING NIET RAAKT. De acht cijfers staan aan de staart van `id_spotify`, dus wie de
// sleutel leest houdt hetzelfde mix-ID over als voorheen. `id` blijft daarmee overal in deze app DE
// sleutel; wat verandert is alleen de vorm waarin hij op Spotify staat. parseMixIdTag (mixIdTag.ts)
// leest daarom beide vormen, en dat is wat de overgang zonder knip laat verlopen: playlists die nog het
// kale ID dragen blijven gewoon koppelen.
//
// DE STAART IS EEN CONTROLE, GEEN AANNAME. Loopt de staart van `id_spotify` niet gelijk met `id`, dan
// spreekt de bron zichzelf tegen, en de mix waar de beschrijving straks naar wijst zou een ándere zijn
// dan de mix waar hij bij staat. Dat wordt hier een BLOKKADE, niet een stille voorkeur voor een van de
// twee -- dezelfde lijn als de kleur-emoji in spotifyTitle.ts: een fout in de bron hoort zichtbaar te
// worden en daar rechtgezet, niet hier weggepoetst.
//
// Pure module: geen fs, geen React.
import type { Mix } from "./types";

/** De vorm die de veldspec voorschrijft: `mmc_[family]_[bpm]bpm_[power]_[freq]_[color]_[YYYYMMDD]`.
 *
 *  Hier bewust niet veld voor veld gecontroleerd -- dat zou de veldspec van de bron dupliceren en bij
 *  elke nieuwe kleur of genre-familie hier moeten bijkomen. Wat wél telt is dat de waarde één woord is
 *  (geen spaties, geen `·`) en op acht cijfers eindigt: het eerste maakt hem herkenbaar als segment in
 *  een beschrijving, het tweede maakt hem koppelbaar. */
const SPOTIFY_ID_SHAPE = /^[a-z0-9]+(?:_[a-z0-9]+)*_(\d{8})$/i;

/** De acht cijfers aan de staart van een `id_spotify`, of `null` als de waarde die vorm niet heeft.
 *
 *  Dit is wat parseMixIdTag gebruikt om uit de nieuwe vorm het vertrouwde mix-ID te halen. */
export function mixIdFromSpotifyId(value: string | null | undefined): string | null {
  const hit = (value ?? "").trim().match(SPOTIFY_ID_SHAPE);
  return hit ? hit[1] : null;
}

/** De ruwe `id_spotify`-waarde uit de JSON, of `null` als de bron er geen levert of de waarde niet de
 *  afgesproken vorm heeft.
 *
 *  Anders dan bij de titel gebeurt hier géén bewerking: de sleutel wordt letterlijk overgenomen. Wat
 *  hier wordt afgewezen is alleen wat niet als sleutel kán dienen -- witruimte erin, een ontbrekende
 *  datumstaart. Aangeroepen door de leeslaag (mixStore.ts), zodat de rest van de app alleen nog een
 *  waarde ziet waarvan de vorm al vaststaat. */
export function normalizeSpotifyId(raw: string | undefined | null): string | null {
  const schoon = (raw ?? "").trim();
  if (schoon === "") return null;
  return SPOTIFY_ID_SHAPE.test(schoon) ? schoon : null;
}

/** Waarom `id_spotify` van deze mix (nog) niet naar Spotify mag, of `null` als er niets in de weg staat.
 *
 *  Eén reden per keer, de belangrijkste eerst -- de aanroeper toont hem letterlijk aan Dave, dus het is
 *  een uitleg en geen foutcode. Zelfde vorm en zelfde bedoeling als titleBlocker in spotifyTitle.ts. */
export function spotifyIdBlocker(mix: Mix): string | null {
  if (mix.id === "") {
    return "Deze mix heeft geen id in de bron, dus er is geen sleutel om te schrijven.";
  }

  if (mix.spotifyId === null) {
    return (
      "Deze mix heeft geen bruikbare id_spotify in de bron. Het veld hoort de vorm " +
      "mmc_edm_128bpm_light_f_cyan_20251108 te hebben en op acht cijfers te eindigen."
    );
  }

  const staart = mixIdFromSpotifyId(mix.spotifyId);
  if (staart !== mix.id) {
    return (
      `id_spotify eindigt op ${staart}, maar deze mix heeft id ${mix.id}. De bron spreekt zichzelf ` +
      `daar tegen: de beschrijving zou dan naar een andere mix wijzen dan waar hij bij staat. Zet het ` +
      `recht in djcylow-react, dan loopt deze playlist mee zonder dat hier iets hoeft te veranderen.`
    );
  }

  return null;
}

/** De sleutel die in de beschrijving van deze mix hoort te staan.
 *
 *  De volle vorm waar die te vertrouwen is, en anders het kale mix-ID -- want een beschrijving zónder
 *  sleutel is geen spiegel, en dat zou een stap terug zijn ten opzichte van wat er al staat. De
 *  blokkade hierboven is dus een blokkade op het OPWAARDEREN, niet op het schrijven zelf. */
export function descriptionKeyOf(mix: Mix): string {
  return spotifyIdBlocker(mix) === null && mix.spotifyId !== null ? mix.spotifyId : mix.id;
}
