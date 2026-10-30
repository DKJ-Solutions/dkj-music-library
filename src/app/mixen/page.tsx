// De mixen-hub op /mixen: één grid met een card-link per pagina eronder, zelfde vorm als de Spotify-hub op
// /spotify. De Published-card drilt door naar /mixen/published, waar een card per mix staat die op
// djcylow.com gepubliceerd is; de Planned-card naar /mixen/planned, voor de mixen die nog moeten komen; de
// Preparation-card naar /mixen/preparation, een card per Spotify-werkbak die op "Vol. X" eindigt.
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";
import { readMixes } from "@/lib/mixes/mixStore";
import { preparationPlaylists } from "@/lib/mixes/preparation";
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { pageTitle } from "@/lib/pages";

// Leest de mix-JSON's en de Spotify-snapshot van schijf voor de aantallen op de cards, en die wijzigen buiten
// de build.
export const dynamic = "force-dynamic";

export default function MixenHubPage() {
  const published = readMixes().filter((mix) => mix.slug).length;
  const preparation = preparationPlaylists(readSnapshot()?.playlists ?? []).length;
  const cards: PageCard[] = [
    {
      href: "/mixen/published",
      icon: "disc",
      label: pageTitle("/mixen/published"),
      sub: `Alle mixen die nu op djcylow.com staan · ${published} mixen`,
    },
    {
      href: "/mixen/planned",
      icon: "calendar",
      label: pageTitle("/mixen/planned"),
      sub: "De mixen die nog op djcylow.com moeten verschijnen",
    },
    {
      href: "/mixen/preparation",
      icon: "list",
      label: pageTitle("/mixen/preparation"),
      sub: `De Spotify-werkbakken op Vol. X · ${preparation} playlists`,
    },
  ];

  return (
    <main className="page-column">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Mixen</p>
        <h1>{pageTitle("/mixen")}</h1>
      </header>

      <section className="layer">
        <PageCardGrid cards={cards} />
      </section>
    </main>
  );
}
