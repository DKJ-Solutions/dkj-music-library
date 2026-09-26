// BPM-sub-route binnen MMC: 176 BPM. Dun schilletje -- de eigenlijke fs-read/filter/rendering zit
// in BpmPage (components/spotify/BpmPage.tsx), gedeeld met de andere drie BPM-sub-routes.
import { BpmPage } from "@/components/spotify/BpmPage";

// Zelfde reden als /spotify/page.tsx: leest een fs-snapshot die buiten de build kan wijzigen.
export const dynamic = "force-dynamic";

export default function Bpm176Page() {
  return <BpmPage bpm={176} />;
}
