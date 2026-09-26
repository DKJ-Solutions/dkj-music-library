// DE HARDE SLEUTEL: het mix-ID uit de **beschrijving** van een Spotify-playlist lezen. Daarmee koppelt
// de brug op een exacte match in plaats van op een gewogen gok (containment + grootte-verhouding).
//
// Dit bestand is de LEESKANT. De schrijfkant -- en daarmee het volledige formaat van de beschrijving --
// woont in mixDescription.ts; deze module hoeft alleen het ID eruit te halen, en dan wel uit beide
// vormen die in het wild kunnen staan:
//
//   * **de huidige** (Dave, 2026-08-11): `Tech House · Red Light (m) · Vol. 6 ·
//     mmc_edm_128bpm_full_m_red_20260615` -- `id_spotify` uit de bron, als laatste `·`-segment. De acht
//     cijfers staan aan de staart, dus het mix-ID is er nog steeds uit te lezen.
//   * **de vorige** (Dave, 2026-07-25): `Tech House · Red Light (m) · Vol. 6 · 20260615` -- het ID
//     kaal, als laatste `·`-segment. Acht cijfers, want dat ís het `id`-formaat in de mix-JSON's.
//   * **de oudste**: `mix:20260615` -- met voorvoegsel, ergens in de tekst. Blijft leesbaar zodat wat er
//     al geschreven is niet stukloopt bij de overstap.
//
// DAT DE DRIE NAAST ELKAAR LEESBAAR ZIJN, IS WAT DE OVERGANG ZONDER KNIP LAAT VERLOPEN: een playlist die
// nog de vorige vorm draagt koppelt gewoon door tot hij herschreven wordt. Er is dus nooit een moment
// waarop de brug een deel van zijn koppelingen kwijt is.
//
// Waarom de kale vorm alleen op zijn PLEK te herkennen is: een los getal van acht cijfers kan ook een
// datum in een gewone beschrijving zijn ("Opgenomen op 20260303"). Het oudste formaat loste dat op met
// een voorvoegsel; de twee latere lossen het op met de positie. Zie KEY_SEGMENT hieronder.
//
// Puur functioneel (geen fs/React).

/** Herkent `mix:20260303` ergens in de tekst. Tolerant voor hoofdletters en witruimte rond de dubbele
 *  punt, want de beschrijving is met de hand ingetypt. Bewust géén woordgrens vóór `mix`: dan zou
 *  "(mix:20260303)" nog werken maar "Vol.4mix:..." niet, en dat verschil helpt niemand.
 *
 *  Geëxporteerd omdat mixDescription.ts moet weten of een bestaande beschrijving nog het oude formaat
 *  draagt -- die kennis mag maar op één plek staan. */
export const MIX_ID_TAG_PATTERN = /mix\s*:\s*(\d{8})/i;

/** Het sleutel-segment zoals het in een beschrijving kan staan: een reeks woorddelen met een
 *  onderstreping ertussen, eindigend op acht cijfers -- óf alleen die acht cijfers. Groep 1 is de hele
 *  sleutel zoals hij er staat, groep 2 zijn de acht cijfers.
 *
 *  De `(?:…_)*` is precies wat de twee vormen samenneemt: nul herhalingen levert het kale ID, meer
 *  levert `mmc_edm_128bpm_full_m_red_20260615`. */
export const KEY_SEGMENT = "((?:[a-z0-9]+_)*(\\d{8}))";

/** Is dit hele segment de sleutel? Voor een aanroeper die een beschrijving al in segmenten heeft
 *  gehakt en er alleen nog het sleutel-segment uit hoeft te zeven (parseMixDescription doet dat).
 *
 *  Neemt het oudste `mix:`-voorvoegsel mee, want ook dan is het segment de sleutel en geen veld. */
export function isKeySegment(segment: string): boolean {
  return new RegExp(`^(?:mix\\s*:\\s*)?${KEY_SEGMENT}$`, "i").test(segment.trim());
}

/** De sleutel uit de plaatsgebonden vormen: het laatste segment van het beheerde blok.
 *
 *  Een kaal getal van acht cijfers is op zichzelf dubbelzinnig -- het kan ook een datum in vrije tekst
 *  zijn. Wat het ondubbelzinnig maakt is de POSITIE: het staat direct achter een `·`-scheiding, aan het
 *  begin van de beschrijving, en er komt niets anders achter dan de vrije-tekst-scheiding. Vandaar het
 *  anker op `^` plus de eis van een voorafgaand segment. Zie mixDescription.ts voor het hele formaat. */
const KEY_IN_BLOCK = new RegExp(`^[^—]*?·\\s*${KEY_SEGMENT}(?=\\s*(?:—|$))`, "i");

/** Het mix-ID (de acht cijfers) uit een playlistbeschrijving, of `null` als er geen in staat.
 *
 *  Leest ALLE DRIE de vormen, want er staan beschrijvingen in oudere formaten:
 *   - de huidige: `… · Vol. 6 · mmc_edm_128bpm_full_m_red_20260615` (de volle sleutel, laatste segment);
 *   - de vorige:  `… · Vol. 6 · 20260615` (kaal ID, laatste segment);
 *   - de oudste:  `mix:20260615 — Liquid D&B` (met voorvoegsel, ergens in de tekst).
 *
 *  Het antwoord is in alle drie de gevallen hetzelfde: de acht cijfers. Dát is de sleutel waarop de rest
 *  van de app koppelt, en dat verandert dus niet mee met de vorm waarin hij op Spotify staat.
 *
 *  Een plaatsgebonden vorm gaat vóór: staat er een beheerd blok, dan is dát de afspraak. Staan er
 *  meerdere `mix:`-tags in, dan wint de eerste -- een beschrijving hoort één mix aan te wijzen, en bij
 *  twijfel is "de eerste" een voorspelbare regel. */
export function parseMixIdTag(description: string | null | undefined): string | null {
  const tekst = description ?? "";
  const inBlok = tekst.match(KEY_IN_BLOCK);
  if (inBlok) return inBlok[2];
  const hit = tekst.match(MIX_ID_TAG_PATTERN);
  return hit ? hit[1] : null;
}

// DE SLEUTEL ZOALS HIJ ER LETTERLIJK STAAT -- de vraag "in wélke vorm" tegenover "wélke mix" -- wordt
// beantwoord door `parseMixDescription(...).key` in mixDescription.ts, niet door een tweede functie
// hier. Die stond er even, en gaf op `mix:20260615` een ánder antwoord dan de parser daar: null tegen
// "20260615". Twee lezers van dezelfde afspraak die het oneens zijn, is precies wat dit bestand op
// elke andere plek probeert te voorkomen.

/** Draagt deze beschrijving het ID van dít mix? Onderscheidt een verkeerd ID van een ontbrekend. */
export function hasMixId(description: string | null | undefined, mixId: string): boolean {
  return parseMixIdTag(description) === mixId;
}
