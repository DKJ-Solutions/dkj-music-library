// De Spotify-hub op /spotify, in drie secties met elk een h2 (Dave, #122): Connection (de Login- en de
// Sync-kaart, ConnectionCards.tsx), Playlists (dezelfde cards als /spotify/playlists) en Dashboard (het
// data-dashboard en het trackregister). /spotify/verbinding stuurt hierheen door. De kolom is de
// .page-column van de huisstijl, zoals op de homepagina: de gap en de ruimte boven elke sectie komen daaruit.
import ConnectionCards from "@/components/spotify/ConnectionCards";
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";
import { playlistCards } from "@/components/spotify/playlistCards";
import { pageTitle } from "@/lib/pages";

export const dynamic = "force-dynamic";

const DASHBOARD_CARDS: PageCard[] = [
  {
    href: "/spotify/dashboard",
    icon: "chart",
    label: pageTitle("/spotify/dashboard"),
    sub: "Dedup, top-artiesten en verdelingen over de hele bibliotheek",
  },
  {
    href: "/spotify/trackregister",
    icon: "table",
    label: pageTitle("/spotify/trackregister"),
    sub: "Elke track met zijn eigen velden, te filteren op BPM en album",
  },
];

interface SpotifyHubPageProps {
  searchParams: Promise<{ connected?: string; error?: string }>;
}

export default async function SpotifyHubPage({ searchParams }: SpotifyHubPageProps) {
  return (
    <main className="page-column">
      <h1>{pageTitle("/spotify")}</h1>
      <ConnectionCards params={await searchParams} />
      <PageCardGrid title="Playlists" cards={playlistCards()} />
      <PageCardGrid title="Dashboard" cards={DASHBOARD_CARDS} />
    </main>
  );
}
