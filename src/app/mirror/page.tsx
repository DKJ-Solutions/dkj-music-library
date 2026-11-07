// De desktop-mirror op /mirror (#145): de werkschijf met de muziek en de rekordbox-bibliotheek, één kant op
// gespiegeld naar een reserveschijf. Eerst een dry run die toont wat er gekopieerd en wat er op de reserve
// verwijderd wordt, dan pas, na een bevestiging, de spiegel zelf (MirrorPanel). Waarom en wanneer hij weigert:
// lib/mirror/mirrorRunner.ts. De card ernaartoe staat op Home.
import { MirrorPanel } from "@/components/mirror/MirrorPanel";
import { readMirrorConfig, readMirrorState } from "@/lib/mirror/mirrorConfig";
import { getMirrorRunStatus } from "@/lib/mirror/mirrorRunner";
import { pageTitle } from "@/lib/pages";

// Leest de instelling en de laatste spiegel van schijf, bij elk bezoek.
export const dynamic = "force-dynamic";

export default function MirrorPage() {
  const config = readMirrorConfig();
  return (
    <main className="page-column">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Desktop-mirror</p>
        <h1>{pageTitle("/mirror")}</h1>
      </header>
      <MirrorPanel
        working={config?.working ?? null}
        reserve={config?.reserve ?? null}
        lastSuccessAt={readMirrorState().lastSuccessAt}
        initialRun={getMirrorRunStatus()}
      />
    </main>
  );
}
