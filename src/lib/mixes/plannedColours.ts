// De kleuren op /mixen/planned, elk met een eigen pagina op /mixen/planned/<kleur>. Eén lijst, zodat de
// cards, de route en de paginanamen (src/lib/pages.ts) dezelfde kleuren kennen.

/** De volgorde zoals gevraagd (27 oktober 2026), niet die van DKJ_ALBUM_COLOURS. */
export const PLANNED_COLOURS = ["Cyan", "Yellow", "Blue", "Green", "Orange", "Magenta", "Red", "Purple"] as const;

export type PlannedColour = (typeof PLANNED_COLOURS)[number];

/** De route van een kleur: /mixen/planned/cyan, enz. */
export function plannedColourHref(colour: PlannedColour): string {
  return `/mixen/planned/${colour.toLowerCase()}`;
}

/** De kleur bij een routesegment ("cyan"), of null als er geen is. */
export function plannedColourOf(segment: string): PlannedColour | null {
  return PLANNED_COLOURS.find((colour) => colour.toLowerCase() === segment) ?? null;
}
