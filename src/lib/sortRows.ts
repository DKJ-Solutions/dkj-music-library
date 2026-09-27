// De sorteermachinerie van de tabellen in de hub, los van welke tabel dan ook. Ontstaan toen de tweede
// tabel op /spotify (de mixen zonder eigen playlist) óók sorteerbaar moest worden: die logica in beide
// tabellen apart neerzetten zou betekenen dat ze op detail uiteen gaan lopen -- de ene tabel die lege
// cellen bovenaan zet, de andere onderaan -- precies waar het om consistentie gaat.
//
// Wat een tabel zelf houdt: welke kolommen er zijn en wat de sorteerwaarde van een cel is. Wat hier
// woont: de klik-cyclus, de vergelijking, en de twee regels die voor élke tabel gelden.
//
// Puur functioneel (geen React/fs), vrij importeerbaar.

export type SortDirection = "asc" | "desc";

export interface Sort<Column extends string> {
  column: Column;
  direction: SortDirection;
}

/** De sorteerwaarde van één cel: een string (alfabetisch), een getal (numeriek), of leeg. */
export type SortKey = string | number | null;

/** Haalt de sorteerwaarde van een cel uit een rij -- per tabel anders, vandaar een callback. */
export type SortKeyFn<Row, Column extends string> = (row: Row, column: Column) => SortKey;

// Nederlandse collatie, case- en diacriet-ongevoelig: "Écarté" hoort bij de E, en "cyan" en "Cyan"
// horen niet uit elkaar te vallen. Eén keer opgebouwd -- een Collator per vergelijking is merkbaar
// duurder over ~380 rijen.
const collator = new Intl.Collator("nl", { sensitivity: "base", numeric: true });

// Leestekens tellen niet mee: "'Til Tuesday" hoort bij de T en "...Baby One More Time" bij de B. Zelf
// weggehaald in plaats van via `ignorePunctuation`, want die negeert ook spaties -- dan valt "De La"
// samen met "Dela". Blijft er niets over (een titel van alleen leestekens), dan telt de oorspronkelijke.
const LEESTEKENS = /\p{P}/gu;

function zonderLeestekens(tekst: string): string {
  const kaal = tekst.replace(LEESTEKENS, "");
  return kaal.trim() === "" ? tekst : kaal;
}

// Een Engels lidwoord vooraan telt niet mee, zoals in elke muziekbibliotheek: "The Beatles" hoort bij de
// B en "A Tribe Called Quest" bij de T. Alleen als los woord gevolgd door witruimte -- "Abba" en "A-ha"
// blijven bij de A -- en alleen als er daarna nog iets overblijft: "The The" sorteert als "The".
const LIDWOORD = /^\s*(?:the|an|a)\s+(?=\S)/iu;

function zonderLidwoord(tekst: string): string {
  return tekst.replace(LIDWOORD, "");
}

/** De tekst zoals hij alfabetisch vergeleken wordt: zonder leestekens en zonder lidwoord vooraan. */
function sorteertekst(tekst: string): string {
  return zonderLidwoord(zonderLeestekens(tekst));
}

/** Alfabetische vergelijking van twee teksten: Nederlandse collatie, hoofdletters, accenten, leestekens
 *  en een Engels lidwoord vooraan (A, An, The) tellen niet, getallen numeriek. Gedeeld met het
 *  trackregister (lib/library/register.ts). */
export function compareText(a: string, b: string): number {
  return collator.compare(sorteertekst(a), sorteertekst(b));
}

function compareKeys(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return compareText(String(a), String(b));
}

function isLeeg(key: SortKey): boolean {
  return key === null || key === "";
}

/** Een rijenlijst gesorteerd op één kolom.
 *
 *  Twee regels die voor elke tabel gelden:
 *   - **Lege cellen staan altijd onderaan**, ook bij `desc`. Een kolom als ID of GENRE is voor een deel
 *     van de rijen leeg; die bovenaan zetten zou de lijst openen met ruis in plaats van met de waarden
 *     waarop je sorteert.
 *   - **Stabiel**: rijen met een gelijke sorteerwaarde houden hun onderlinge volgorde uit de invoer. De
 *     index dient als tie-break, zodat de uitkomst niet van de JS-engine afhangt.
 *
 *  De invoer wordt niet gemuteerd. */
export function sortRows<Row, Column extends string>(
  rows: readonly Row[],
  sort: Sort<Column>,
  sortKey: SortKeyFn<Row, Column>
): Row[] {
  const richting = sort.direction === "asc" ? 1 : -1;

  return rows
    .map((row, index) => ({ row, index, key: sortKey(row, sort.column) }))
    .sort((a, b) => {
      const aLeeg = isLeeg(a.key);
      const bLeeg = isLeeg(b.key);
      if (aLeeg && bLeeg) return a.index - b.index;
      if (aLeeg) return 1;
      if (bLeeg) return -1;

      const verschil = compareKeys(a.key as string | number, b.key as string | number);
      return verschil !== 0 ? verschil * richting : a.index - b.index;
    })
    .map((rij) => rij.row);
}

/** De volgende sorteerstand bij een klik op een kolomkop: eerst oplopend, dan aflopend, dan terug naar
 *  de standaardordening (`null`). Die derde stand is er bewust -- zonder die klik kun je niet meer terug
 *  naar de lijst zoals hij zonder sortering staat. */
export function nextSort<Column extends string>(
  current: Sort<Column> | null,
  column: Column
): Sort<Column> | null {
  if (current === null || current.column !== column) return { column, direction: "asc" };
  if (current.direction === "asc") return { column, direction: "desc" };
  return null;
}
