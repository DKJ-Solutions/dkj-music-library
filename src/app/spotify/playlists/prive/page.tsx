// Wereld-route: Privé. Dun schilletje -- de eigenlijke fs-read/filter/rendering zit in WorldPage
// (components/spotify/WorldPage.tsx), gedeeld met de andere twee wereld-routes.
import { WorldPage } from "@/components/spotify/WorldPage";

// Zelfde reden als /spotify/page.tsx: leest een fs-snapshot die buiten de build kan wijzigen.
export const dynamic = "force-dynamic";

export default function PrivePage() {
  return <WorldPage world="prive" />;
}
