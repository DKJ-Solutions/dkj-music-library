// De Playlists-hub op /spotify/playlists, een laag onder /spotify: één grid met een card per
// playlist-pagina, in de vorm van de Spotify-hub. Server Component: leest de verrijkte playlists
// (fase 4) alleen om de wereld-cards hun aantal playlists als onderschrift te geven.
import { getEnrichedSnapshot } from "@/lib/spotify/enrichedPlaylists";
import { countByWorld } from "@/lib/spotify/playlistFilters";
import { SPOTIFY_WORLDS, WORLD_META } from "@/lib/spotify/classifyWorld";
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";
import { pageTitle } from "@/lib/pages";

export const dynamic = "force-dynamic";

const PAGE_CARDS: PageCard[] = [
  {
    href: "/spotify/playlists/manager",
    icon: "list",
    label: pageTitle("/spotify/playlists/manager"),
    sub: "Alle playlists, met filteren, groeperen en cross-playlist zoeken",
  },
  {
    href: WORLD_META.mmc.href,
    icon: "palette",
    label: pageTitle(WORLD_META.mmc.href),
    sub: "De genummerde House- en Drum & Bass-mixen, per BPM",
  },
  {
    href: WORLD_META.djcylow.href,
    icon: "disc",
    label: pageTitle(WORLD_META.djcylow.href),
    sub: "Het DJ-werk: Feestzaal-fases, gigs en compilaties",
  },
  {
    href: WORLD_META.prive.href,
    icon: "lock",
    label: pageTitle(WORLD_META.prive.href),
    sub: "Persoonlijke lijsten en playlists die je alleen volgt",
  },
  {
    href: "/spotify/playlists/maple-classic",
    icon: "users",
    label: pageTitle("/spotify/playlists/maple-classic"),
    sub: "De gedeelde playlist als tabel",
  },
  {
    href: "/spotify/playlists/classic-pop",
    icon: "star",
    label: pageTitle("/spotify/playlists/classic-pop"),
    sub: "Elk Classic Pop-nummer één keer, met de playlists waarin het staat",
  },
];

export default function PlaylistsHubPage() {
  const enriched = getEnrichedSnapshot();
  const worldCounts = enriched ? countByWorld(enriched.playlists) : null;
  // De wereld-cards dragen hun aantal playlists zodra er een snapshot is.
  const cards = PAGE_CARDS.map((card) => {
    const world = SPOTIFY_WORLDS.find((w) => WORLD_META[w].href === card.href);
    return world && worldCounts ? { ...card, sub: `${card.sub} · ${worldCounts[world]} playlists` } : card;
  });

  return (
    <main className="wrap">
      <header className="masthead">
        <h1>{pageTitle("/spotify/playlists")}</h1>
      </header>

      <section className="layer">
        <PageCardGrid cards={cards} />
      </section>
    </main>
  );
}
