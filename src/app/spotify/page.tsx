// De Spotify-hub op /spotify: één grid met een card per pagina eronder, en verder niets. Server
// Component: leest de tokens (OAuth-status) alleen om de verbinding-card een actueel onderschrift te
// geven. De verbinding zelf (status, login/logout, sync) staat sinds de cards op /spotify/verbinding;
// de playlist-pagina's (manager, de drie werelden, Maple Classic, Classic Pop) een laag dieper, op
// /spotify/playlists.
import { readTokens } from "@/lib/spotify/tokenStore";
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";
import { pageTitle } from "@/lib/pages";

export const dynamic = "force-dynamic";

// De pagina's onder /spotify, als card-links (stonden eerder op de homepagina). Ze hangen niet af van
// een snapshot: het register leest de bibliotheek uit git, dus deze links horen ook zichtbaar te
// zijn op een machine die nog nooit gesynct heeft.
const PAGE_CARDS: PageCard[] = [
  {
    href: "/spotify/playlists",
    icon: "music",
    label: pageTitle("/spotify/playlists"),
    sub: "De playlist manager, de drie werelden, Maple Classic en Classic Pop",
  },
  {
    href: "/spotify/trackregister",
    icon: "table",
    label: pageTitle("/spotify/trackregister"),
    sub: "Elke track met zijn eigen velden, te filteren op BPM en album",
  },
  {
    href: "/spotify/dashboard",
    icon: "chart",
    label: pageTitle("/spotify/dashboard"),
    sub: "Dedup, top-artiesten en verdelingen over de hele bibliotheek",
  },
  {
    href: "/spotify/verbinding",
    icon: "plug",
    label: pageTitle("/spotify/verbinding"),
    sub: "Inloggen bij Spotify en de back-up syncen",
  },
];

export default function SpotifyHubPage() {
  const connected = readTokens() !== null;
  // Elke pagina staat één keer op deze pagina: als card. De verbinding-card draagt of er een
  // koppeling met Spotify is.
  const cards = PAGE_CARDS.map((card) =>
    card.href === "/spotify/verbinding"
      ? { ...card, sub: `${card.sub} · ${connected ? "verbonden" : "niet verbonden"}` }
      : card,
  );

  return (
    <main className="wrap">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Spotify</p>
        <h1>{pageTitle("/spotify")}</h1>
      </header>

      <section className="layer">
        <PageCardGrid cards={cards} />
      </section>
    </main>
  );
}
