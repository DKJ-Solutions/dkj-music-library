// DE PLAYLISTBESCHRIJVING ALS SPIEGEL VAN DE MIX-JSON (Dave, 2026-07-25).
//
// De afspraak, letterlijk zoals Dave hem opgaf:
//
//     Tech House · Red Light (m) · Vol. 6 · 20260615
//     └ subgenre   └ color+power+frequency  └ volume  └ id
//
// Dat is de `title`-vorm uit de veldspecificatie van de mix-bron
// (`[Subgenre] · [Color] [Power] ([Frequency]) Mix · Vol. [N]`) zonder het woord "Mix", met het
// mix-ID erachter. Daarmee dragen beide bronnen dezelfde waarden en is per veld te zien of ze
// uiteenlopen.
//
// WAAROM `genre` ER NIET IN STAAT. Dave noemde hem wel, maar de veldspec koppelt elk subgenre vast
// aan één genre-familie ("Tech House" -> "House", "Melodic Techno" -> "Techno"). De familie is dus
// af te leiden en zou alleen ruimte kosten in een veld dat Spotify afkapt. Wil je hem er alsnog bij,
// dan is dat één extra segment hier.
//
// SINDS 2026-08-11 IS HET LAATSTE SEGMENT `id_spotify` (Dave). Waar er `20260615` stond, staat nu
// `mmc_edm_128bpm_full_m_red_20260615` -- de sprekende sleutel die de bron zelf levert. De acht cijfers
// zitten aan de staart, dus de koppeling verandert er niet door; zie spotifyId.ts voor de vorm en voor
// de blokkade als de bron zichzelf daar tegenspreekt.
//
// HET LAATSTE SEGMENT IS DE SLEUTEL, EN DAT KAN ALLEEN DOOR DE POSITIE. Het oudste formaat schreef
// `mix:20260615`, juist omdat een los getal van acht cijfers ook een datum in een gewone beschrijving
// kan zijn (zie mixIdTag.ts). Sindsdien is de plek het bewijs: alleen het LAATSTE `·`-segment van het
// beheerde blok telt als sleutel. parseMixIdTag leest alle drie de vormen, zodat wat er al staat blijft
// werken zolang het er staat.
//
// Pure module: geen fs, geen React. De formatter en de parser staan hier samen, zodat wat de hub
// schrijft per definitie is wat de hub kan lezen -- dezelfde regel als in mixIdTag.ts.
import type { Mix } from "./types";
import { isKeySegment, KEY_SEGMENT, MIX_ID_TAG_PATTERN } from "./mixIdTag";
import { descriptionKeyOf } from "./spotifyId";

/** Het scheidingsteken tussen de segmenten. Een midden-punt met spaties eromheen, precies zoals de
 *  veldspec van de mix-bron het voorschrijft ("use middle dot ·, not hyphen, not dash"). */
export const SEGMENT_SEPARATOR = " · ";

/** Scheidt het beheerde blok van vrije tekst die Dave er zelf achter zet. Zelfde teken als het oude
 *  formaat gebruikte, zodat een bestaande beschrijving met vrije tekst herkenbaar blijft. */
const FREE_TEXT_SEPARATOR = " — ";

/** De velden die het beheerde blok draagt, uitgepakt. `null` = het segment stond er niet (of niet in
 *  een leesbare vorm) -- bij een legacy-entry zonder subgenre of volume is dat normaal. */
export interface ParsedMixDescription {
  subgenre: string | null;
  color: string | null;
  density: string | null;
  gender: string | null;
  volume: number | null;
  /** Het mix-ID (de acht cijfers) uit het laatste segment. `null` maakt het blok ongeldig -- zonder ID
   *  is er geen sleutel en dus geen spiegel. */
  mixId: string | null;
  /** Het sleutel-segment zoals het er LETTERLIJK staat: `mmc_edm_128bpm_full_m_red_20260615` in de
   *  huidige vorm, `20260615` in de vorige. Daarmee is te zien of een beschrijving nog opgewaardeerd
   *  moet worden -- `mixId` zegt dat niet, want die is in beide vormen gelijk. */
  key: string | null;
}

/** Het beheerde blok voor deze mix, zoals de hub het schrijft.
 *
 *  Lege velden leveren géén leeg segment op: `Blue Full (f) · 20240408` is leesbaar, `· · Vol. ·`
 *  niet. De sleutel staat altijd achteraan -- dat is waar de parser op ankert. Een mix zonder ID levert
 *  een lege string: dan valt er niets te spiegelen.
 *
 *  Wélke sleutel dat is, bepaalt descriptionKeyOf (spotifyId.ts): `id_spotify` waar die te vertrouwen
 *  is, en anders het kale mix-ID. Een tegenstrijdige bron levert dus geen tegenstrijdige beschrijving
 *  maar de oude, veilige vorm. */
export function formatMixDescription(mix: Mix): string {
  if (!mix.id) return "";

  const dimensies = [mix.color, mix.density, mix.gender ? `(${mix.gender})` : null]
    .filter((deel): deel is string => Boolean(deel))
    .join(" ");

  const segmenten = [
    mix.subgenre,
    dimensies || null,
    mix.volume !== null ? `Vol. ${mix.volume}` : null,
    descriptionKeyOf(mix),
  ].filter((deel): deel is string => Boolean(deel));

  return segmenten.join(SEGMENT_SEPARATOR);
}

/** Herkent het beheerde blok aan het BEGIN van een beschrijving: een reeks `·`-segmenten die eindigt
 *  op de sleutel (de volle `id_spotify`-vorm of het kale ID), of het oudste `mix:`-formaat.
 *
 *  Het anker is bewust `^`: zo kan een los jaartal of een datum in vrije tekst nooit voor het blok
 *  worden aangezien, en blijft het vervangen van het blok voorspelbaar. `[^—]*?` houdt het blok voor
 *  de vrije-tekst-scheiding -- staat er `... · 20260615 — Lekker in de auto`, dan hoort dat laatste
 *  stuk niet bij het blok.
 *
 *  Groep 1 is de sleutel zoals hij er staat, groep 2 zijn de acht cijfers erin (zie KEY_SEGMENT). */
const MANAGED_BLOCK = new RegExp(
  `^\\s*(?:[^—]*?${SEGMENT_SEPARATOR.trim()}\\s*)?(?:mix\\s*:\\s*)?${KEY_SEGMENT}`,
  "i"
);

/** De velden uit het beheerde blok, of `null` als er geen blok in staat.
 *
 *  Tolerant in wat het accepteert (de segmenten mogen in principe in elke volgorde staan en elk veld
 *  wordt op zijn eigen vorm herkend), streng in wat het als geldig blok ziet: zonder mix-ID is het
 *  geen spiegel. Die tolerantie is er omdat de beschrijving met de hand aan te passen is -- dan hoort
 *  een extra spatie of een omgewisseld segment de vergelijking niet te breken. */
export function parseMixDescription(description: string | null | undefined): ParsedMixDescription | null {
  const tekst = (description ?? "").trim();
  if (tekst === "") return null;

  const blok = MANAGED_BLOCK.exec(tekst);
  if (!blok) return null;

  // Alleen het deel vóór de vrije-tekst-scheiding meenemen: wat Dave er zelf achter typt hoort niet
  // als veld gelezen te worden.
  const beheerd = tekst.split(FREE_TEXT_SEPARATOR)[0];
  const segmenten = beheerd
    .split(SEGMENT_SEPARATOR.trim())
    .map((s) => s.trim())
    .filter((s) => s !== "");

  let color: string | null = null;
  let density: string | null = null;
  let gender: string | null = null;
  let volume: number | null = null;
  const overig: string[] = [];

  for (const segment of segmenten) {
    // Het sleutel-segment: de volle `id_spotify`-vorm, het kale ID, of het oudste `mix:`-voorvoegsel.
    // Wordt hieronder los bepaald.
    if (isKeySegment(segment)) continue;

    const vol = segment.match(/^vol\.?\s*(\d+)$/i);
    if (vol) {
      volume = Number(vol[1]);
      continue;
    }

    // Het dimensie-segment is het enige met een `(f)`/`(m)`-staartje, en de kleur/power staan ervoor.
    const dims = segment.match(/^([A-Za-z]+)(?:\s+(Full|Light))?(?:\s*\(([fm])\))?$/i);
    if (dims && (dims[2] || dims[3])) {
      color = dims[1];
      density = dims[2] ?? null;
      gender = dims[3] ? dims[3].toLowerCase() : null;
      continue;
    }

    overig.push(segment);
  }

  return {
    // Wat overblijft is het subgenre: het enige vrije-tekst-veld in het blok. Meerdere resten worden
    // samengevoegd zodat een subgenre met een midden-punt erin niet stilletjes half verdwijnt.
    subgenre: overig.length > 0 ? overig.join(SEGMENT_SEPARATOR) : null,
    color,
    density,
    gender,
    volume,
    mixId: blok[2] ?? null,
    key: blok[1] ?? null,
  };
}

/** De beschrijving met het beheerde blok van `mix` erin, **zonder de vrije tekst te verliezen**.
 *
 *  Spotify's `PUT` vervángt de hele beschrijving, dus wie alleen het blok verstuurt wist wat er
 *  stond. Drie gevallen, gelijk aan hoe het oude `withMixIdTag` werkte:
 *   1. er staat al een blok (nieuw formaat óf de oude `mix:`-tag) -> dat wordt vervangen, de vrije
 *      tekst erachter blijft staan;
 *   2. er staat vrije tekst zonder blok -> het blok komt ervóór, gescheiden door " — ";
 *   3. er staat niets -> alleen het blok. */
export function withMixDescription(description: string | null | undefined, mix: Mix): string {
  const blok = formatMixDescription(mix);
  const bestaand = (description ?? "").trim();
  if (blok === "") return bestaand;

  const vrijeTekst = vrijeTekstVan(bestaand);
  return vrijeTekst === "" ? blok : `${blok}${FREE_TEXT_SEPARATOR}${vrijeTekst}`;
}

/** De beschrijving zónder het beheerde blok -- voor het terugdraaien van een schrijfactie. Heen en
 *  terug komt weer op de oorspronkelijke vrije tekst uit. */
export function withoutMixDescription(description: string | null | undefined): string {
  return vrijeTekstVan((description ?? "").trim());
}

/** Wat er ná het beheerde blok staat: Dave's eigen tekst. Leeg als er niets (meer) staat. */
function vrijeTekstVan(bestaand: string): string {
  if (bestaand === "") return "";

  // Staat er een scheidingsteken, dan is alles erna vrije tekst -- ook als het blok ervóór in een
  // ander formaat staat.
  const index = bestaand.indexOf(FREE_TEXT_SEPARATOR);
  if (index !== -1) {
    const voor = bestaand.slice(0, index);
    if (MANAGED_BLOCK.test(voor) || MIX_ID_TAG_PATTERN.test(voor)) {
      return bestaand.slice(index + FREE_TEXT_SEPARATOR.length).trim();
    }
    return bestaand;
  }

  // Geen scheidingsteken: de hele tekst is óf het blok (dan blijft er niets over) óf vrije tekst.
  return MANAGED_BLOCK.test(bestaand) ? "" : bestaand;
}

/** Eén afwijking tussen de beschrijving op Spotify en de mix-JSON. */
export interface DescriptionFieldDiff {
  /** Veldnaam zoals de mix-bron hem noemt -- dat is de bron van waarheid, dus die naam telt.
   *
   *  `id_spotify` is de sleutel achteraan, en hij wijkt af zolang een playlist nog het kale mix-ID
   *  draagt (de vorm van vóór 2026-08-11) of de oudste `mix:`-tag. */
  field: "subgenre" | "color" | "power" | "frequency" | "volume" | "id_spotify";
  /** Wat er nu in de playlistbeschrijving staat (`null` = het segment ontbreekt). */
  inDescription: string | null;
  /** Wat de mix-JSON zegt -- wat er dus zou moeten staan. */
  inMix: string | null;
}

export type DescriptionState =
  /** Er staat geen beheerd blok in de beschrijving: hij is nog nooit geschreven. */
  | "missing"
  /** Het blok staat er en klopt veld voor veld met de JSON. */
  | "in-sync"
  /** Het blok staat er, maar minstens één veld wijkt af van de JSON -- bv. omdat de mix-data is
   *  bijgewerkt nadat de beschrijving is geschreven. Herschrijven lost het op. */
  | "outdated";

/** Hoe de beschrijving van een playlist zich verhoudt tot de mix waaraan hij gekoppeld is.
 *
 *  Dit is het antwoord op Dave's doel ("de inhoud moet zoveel mogelijk overeenkomen"): niet alleen
 *  schrijven, maar ook kunnen zien wáár het niet overeenkomt. De vergelijking gaat over de velden,
 *  niet over de letterlijke string -- anders zou een handmatig toegevoegde spatie al een afwijking
 *  zijn. */
export function compareDescription(
  description: string | null | undefined,
  mix: Mix
): { state: DescriptionState; diffs: DescriptionFieldDiff[] } {
  const geparsed = parseMixDescription(description);
  if (geparsed === null) return { state: "missing", diffs: [] };

  const diffs: DescriptionFieldDiff[] = [];
  const vergelijk = (
    field: DescriptionFieldDiff["field"],
    inDescription: string | null,
    inMix: string | null
  ) => {
    // Beide leeg is geen afwijking: een legacy-entry zonder subgenre hoort er ook geen te hebben.
    const a = (inDescription ?? "").trim().toLowerCase();
    const b = (inMix ?? "").trim().toLowerCase();
    if (a !== b) diffs.push({ field, inDescription, inMix });
  };

  vergelijk("subgenre", geparsed.subgenre, mix.subgenre);
  vergelijk("color", geparsed.color, mix.color);
  vergelijk("power", geparsed.density, mix.density);
  vergelijk("frequency", geparsed.gender, mix.gender);
  vergelijk(
    "volume",
    geparsed.volume !== null ? String(geparsed.volume) : null,
    mix.volume !== null ? String(mix.volume) : null
  );
  // De sleutel achteraan. Hier is `descriptionKeyOf` de maat en niet `mix.spotifyId` zelf: spreekt de
  // bron zichzelf tegen, dan is het kale ID de juiste waarde en hoort een beschrijving die dát draagt
  // níet als verouderd te gelden. Anders zou een fout in de bron zich hier als werkvoorraad tonen.
  vergelijk("id_spotify", geparsed.key, descriptionKeyOf(mix));

  return { state: diffs.length === 0 ? "in-sync" : "outdated", diffs };
}
