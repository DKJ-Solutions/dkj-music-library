// Published op /mixen/published: één grid met een card-link per mix die op djcylow.com staat -- de
// publieke mixen uit de DJ Cylow-JSON's (lib/mixes/mixStore.ts), nieuwste eerst, elk naar zijn
// detailpagina op /mixen/published/<slug>. De card ernaartoe staat op de hub /mixen.
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";
import { mixHref } from "@/lib/mixes/mixPages";
import { mixSquareFile, readMixes } from "@/lib/mixes/mixStore";
import type { Mix } from "@/lib/mixes/types";
import { pageTitle } from "@/lib/pages";

// Leest de mix-JSON's van schijf, en die wijzigen buiten de build -- zelfde reden als de /spotify-routes.
export const dynamic = "force-dynamic";

function mixCard(mix: Mix): PageCard | null {
  if (!mix.slug) return null;
  const sub = [mix.genre, mix.bpm ? `${mix.bpm} BPM` : null, mix.date].filter(Boolean).join(" · ");
  // De vierkante thumbnail waar die er is; anders het disc-icoon.
  const image = mixSquareFile(mix.imageSquare) ? `/api/mixes/square/${mix.slug}` : undefined;
  return { href: mixHref(mix.slug), icon: "disc", label: mix.title, sub, image };
}

export default function MixenPublishedPage() {
  // Nieuwste eerst over alle bestanden heen; een mix zonder datum achteraan.
  const cards = readMixes()
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .map(mixCard)
    .filter((card): card is PageCard => card !== null);

  return (
    <main className="wrap">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Mixen</p>
        <h1>{pageTitle("/mixen/published")}</h1>
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
