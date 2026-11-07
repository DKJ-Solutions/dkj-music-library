// De Compare-hub op /compare: één grid met een card-link per vergelijking eronder, zelfde vorm als de hubs
// op /spotify en /mixen. Playlists ↔ Mixes legt de Spotify-playlists naast de mixen van djcylow.com (de
// brug die tot oktober 2026 onder Music Mood Colours stond); PC ↔ Spotify legt de tracks op de pc naast
// de bibliotheek, en heeft nog geen bron.
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";
import { pageTitle } from "@/lib/pages";

const CARDS: PageCard[] = [
  {
    href: "/compare/playlists-mixes",
    icon: "link",
    label: pageTitle("/compare/playlists-mixes"),
    sub: "De mixen van djcylow.com naast de MMC-playlists die ze horen te weerspiegelen",
  },
  {
    href: "/compare/pc-spotify",
    icon: "monitor",
    label: pageTitle("/compare/pc-spotify"),
    sub: "De tracks op je pc naast de tracks op Spotify",
  },
];

export default function CompareHubPage() {
  return (
    <main className="page-column">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Compare</p>
        <h1>{pageTitle("/compare")}</h1>
      </header>

      <section className="layer">
        <PageCardGrid cards={CARDS} />
      </section>
    </main>
  );
}
