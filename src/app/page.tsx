// De homepagina: een grid van card-links, in de vorm van de hub uit de huisstijl ("Page patterns",
// "The hub"): onder de breadcrumb-balk (uit de layout, hier alleen Home) één .grid-3 met een
// .card.card--link per pagina, zonder kop erboven. De pagina's onder Spotify hebben hun card op
// /spotify zelf; komt de desktop-mirror erbij, dan krijgt die hier een eigen card.
//
// Daaronder de Mixen-card: één card met daarin een card-link per publieke mix uit de DJ Cylow-JSON's
// (lib/mixes/mixStore.ts), nieuwste eerst, elk naar zijn pagina op djcylow.com.
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";
import { mixUrl } from "@/lib/library/djcylowMix";
import { readMixes } from "@/lib/mixes/mixStore";
import type { Mix } from "@/lib/mixes/types";
import { pageTitle } from "@/lib/pages";

// Leest de mix-JSON's van schijf, en die wijzigen buiten de build -- zelfde reden als de /spotify-routes.
export const dynamic = "force-dynamic";

const CARDS: PageCard[] = [
  {
    href: "/spotify",
    icon: "music",
    label: pageTitle("/spotify"),
    sub: "Read-only back-up van je Spotify-playlists, met filteren, groeperen en zoeken",
  },
];

function mixCard(mix: Mix): PageCard | null {
  if (!mix.slug) return null;
  const sub = [mix.genre, mix.bpm ? `${mix.bpm} BPM` : null, mix.date].filter(Boolean).join(" · ");
  return { href: mixUrl(mix.slug), icon: "disc", label: mix.title, sub };
}

export default function Home() {
  // Nieuwste eerst over alle bestanden heen; een mix zonder datum achteraan.
  const mixCards = readMixes()
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .map(mixCard)
    .filter((card): card is PageCard => card !== null);

  return (
    <main className="page-column">
      <PageCardGrid cards={CARDS} />
      <section className="card">
        <div className="card__head">
          <h2 className="card__title">Mixen</h2>
        </div>
        {mixCards.length > 0 ? (
          <PageCardGrid cards={mixCards} />
        ) : (
          <p className="empty-note">
            Geen mix-data gevonden -- de bron woont in <code>../djcylow-react/src/data/mixes/</code>.
          </p>
        )}
      </section>
    </main>
  );
}
