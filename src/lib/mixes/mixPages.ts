// De detailpagina's per mix op /mixen/published/<slug>: de route, de mix achter een slug, en de paginanamen voor
// de breadcrumb-balk. De slug is dezelfde als op djcylow.com (mixSlugOf in mixStore.ts), zodat een
// link van de website hier één-op-één te volgen is.
//
// SERVER-ONLY: leest via mixStore.ts van schijf.
import { readMixes } from "./mixStore";
import type { Mix } from "./types";

/** De route van de detailpagina van een mix. */
export function mixHref(slug: string): string {
  return `/mixen/published/${slug}`;
}

/** De publieke mix met deze slug, of null. */
export function findMixBySlug(slug: string): Mix | null {
  return readMixes().find((mix) => mix.slug === slug) ?? null;
}

/** De naam van elke mix-detailpagina, per route -- voor breadcrumbTrail (lib/pages.ts), zodat de
 *  laatste kruimel leest wat de h1 leest. */
export function mixPageTitles(): Record<string, string> {
  return Object.fromEntries(
    readMixes()
      .filter((mix): mix is Mix & { slug: string } => mix.slug !== null)
      .map((mix) => [mixHref(mix.slug), mix.title]),
  );
}
