// De naam van elke pagina, op precies één plek: de breadcrumb-balk (Breadcrumbs.tsx), de h1 van de
// pagina en de card die ernaar linkt lezen hem allemaal hier. De huisstijl eist dat de h1 exact leest
// wat de laatste kruimel leest ("Page patterns", "Every page: the breadcrumb bar") -- één bron maakt
// dat een gegeven in plaats van iets om bij te houden.
//
// Het kruimelpad volgt de route: elk voorvoegsel van het pad dat hier een naam heeft is een kruimel.
// Een wereld of BPM-tier haalt zijn route uit WORLD_META/BPM_TIER_META, zodat een route nergens twee
// keer getypt staat.
import { WORLD_META } from "@/lib/spotify/classifyWorld";
import { BPM_TIER_META, MMC_BPM_TIERS } from "@/lib/spotify/classifyBpm";

export const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/spotify": "Spotify",
  "/spotify/playlists": "Playlist manager",
  "/spotify/trackregister": "DKJ Trackregister",
  "/spotify/dashboard": "Data-dashboard",
  [WORLD_META.mmc.href]: "Music Mood Colours",
  [WORLD_META.djcylow.href]: WORLD_META.djcylow.label,
  [WORLD_META.prive.href]: WORLD_META.prive.label,
  "/spotify/musicmoodcolours/mixen": "Mixen ↔ playlists",
  "/spotify/maple-classic": "Maple Classic 2026 LAN",
  "/spotify/classic-pop": "Classic Pop",
  ...Object.fromEntries(MMC_BPM_TIERS.map((bpm) => [BPM_TIER_META[bpm].href, BPM_TIER_META[bpm].label])),
};

/** De naam van de pagina op `path`. Gooit bij een onbekende route: een pagina zonder naam hier zou
 *  een h1 krijgen die de balk niet kent. */
export function pageTitle(path: string): string {
  const title = PAGE_TITLES[path];
  if (!title) throw new Error(`Geen paginanaam voor ${path} -- voeg hem toe aan src/lib/pages.ts`);
  return title;
}

export interface Crumb {
  href: string;
  label: string;
}

/** Het kruimelpad naar `pathname`: Home, dan elk voorvoegsel met een naam. Een route die hier (nog)
 *  niet staat, zoals een 404, krijgt het pad tot de dichtstbijzijnde bekende ouder. */
export function breadcrumbTrail(pathname: string): Crumb[] {
  const trail: Crumb[] = [{ href: "/", label: PAGE_TITLES["/"] }];
  const segments = pathname.split("/").filter(Boolean);
  for (let i = 1; i <= segments.length; i++) {
    const href = "/" + segments.slice(0, i).join("/");
    const label = PAGE_TITLES[href];
    if (label) trail.push({ href, label });
  }
  return trail;
}
