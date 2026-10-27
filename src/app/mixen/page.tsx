// De mixen-hub op /mixen: één grid met een card-link per publieke mix uit de DJ Cylow-JSON's
// (lib/mixes/mixStore.ts), nieuwste eerst, elk naar zijn pagina op djcylow.com. Zelfde vorm als de
// Spotify-hub op /spotify.
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";
import { mixUrl } from "@/lib/library/djcylowMix";
import { readMixes } from "@/lib/mixes/mixStore";
import type { Mix } from "@/lib/mixes/types";
import { pageTitle } from "@/lib/pages";

// Leest de mix-JSON's van schijf, en die wijzigen buiten de build -- zelfde reden als de /spotify-routes.
export const dynamic = "force-dynamic";

function mixCard(mix: Mix): PageCard | null {
  if (!mix.slug) return null;
  const sub = [mix.genre, mix.bpm ? `${mix.bpm} BPM` : null, mix.date].filter(Boolean).join(" · ");
  return { href: mixUrl(mix.slug), icon: "disc", label: mix.title, sub };
}

export default function MixenHubPage() {
  // Nieuwste eerst over alle bestanden heen; een mix zonder datum achteraan.
  const cards = readMixes()
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .map(mixCard)
    .filter((card): card is PageCard => card !== null);

  return (
    <main className="wrap">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Mixen</p>
        <h1>{pageTitle("/mixen")}</h1>
      </header>

      <section className="layer">
        {cards.length > 0 ? (
          <PageCardGrid cards={cards} />
        ) : (
          <p className="empty-note">
            Geen mix-data gevonden -- de bron woont in <code>../djcylow-react/src/data/mixes/</code>.
          </p>
        )}
      </section>
    </main>
  );
}
