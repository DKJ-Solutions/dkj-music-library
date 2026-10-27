// De homepagina: een grid van card-links, in de vorm van de hub uit de huisstijl ("Page patterns",
// "The hub"): onder de breadcrumb-balk (uit de layout, hier alleen Home) één .grid-3 met een
// .card.card--link per pagina, zonder kop erboven. De pagina's onder Spotify hebben hun card op
// /spotify zelf, de mixen de hunne op /mixen; komt de desktop-mirror erbij, dan krijgt die hier een eigen card.
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";
import { pageTitle } from "@/lib/pages";

const CARDS: PageCard[] = [
  {
    href: "/spotify",
    icon: "music",
    label: pageTitle("/spotify"),
    sub: "Read-only back-up van je Spotify-playlists, met filteren, groeperen en zoeken",
  },
  {
    href: "/mixen",
    icon: "disc",
    label: pageTitle("/mixen"),
    sub: "De mixen van de DJ Cylow-website, met Published: alles wat op djcylow.com staat",
  },
];

export default function Home() {
  return (
    <main className="page-column">
      <PageCardGrid cards={CARDS} />
    </main>
  );
}
