// De persoonlijke regels van de Spotify-mirror, buiten de code: welk Spotify-account "eigen" is, en
// welke playlistnamen altijd naar de wereld Privé gaan (regel 3 in classifyWorld.ts). Tot 2026-09-27
// stonden die hardgecodeerd in enrichedPlaylists.ts en classifyWorld.ts; bij de verhuizing naar deze
// publieke repo zijn ze naar een lokaal bestand gegaan, zodat er geen account-id en geen namen van
// mensen of gelegenheden in git staan.
//
// Het bestand is data/spotify/private-rules.json (dezelfde git-ignored data/-map als de snapshot),
// met private-rules.example.json in de repo-root als voorbeeld. Ontbreekt het, dan geldt: geen eigen
// account (elke playlist telt als "gevolgd") en geen privé-namen. De app draait dan gewoon door, maar
// de indeling klopt niet -- vandaar de waarschuwing in de serverconsole.
//
// SERVER-ONLY: gebruikt Node's `fs`. De client krijgt de uitkomst (EnrichedPlaylist.autoWorld), nooit
// de regels zelf.
import fs from "fs";
import path from "path";
import type { WorldRules } from "./classifyWorld";

const DEFAULT_PRIVATE_RULES_PATH = path.join(process.cwd(), "data", "spotify", "private-rules.json");

export interface PrivateRules extends WorldRules {
  /** Spotify-`owner.id` van het eigen account, of null als het niet is ingesteld. */
  ownerUserId: string | null;
}

function getPrivateRulesPath(): string {
  const override = process.env.SPOTIFY_PRIVATE_RULES_PATH;
  return override ? path.resolve(override) : DEFAULT_PRIVATE_RULES_PATH;
}

/** Zet de ruwe JSON om naar regels. Puur, zodat de validatie los te testen is: een ongeldige regex
 *  wordt overgeslagen met een waarschuwing in plaats van elke pagina te laten omvallen. */
export function parsePrivateRules(raw: unknown): PrivateRules {
  const input = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const ownerUserId =
    typeof input.ownerUserId === "string" && input.ownerUserId.trim() !== "" ? input.ownerUserId.trim() : null;
  const sources = Array.isArray(input.priveNamePatterns) ? input.priveNamePatterns : [];
  const priveNamePatterns: RegExp[] = [];
  for (const source of sources) {
    if (typeof source !== "string" || source === "") continue;
    try {
      priveNamePatterns.push(new RegExp(source, "i"));
    } catch {
      console.warn(`[privateRules] ongeldige regex overgeslagen: ${source}`);
    }
  }
  return { ownerUserId, priveNamePatterns };
}

export function readPrivateRules(): PrivateRules {
  const rulesPath = getPrivateRulesPath();
  if (!fs.existsSync(rulesPath)) {
    console.warn(
      `[privateRules] ${rulesPath} ontbreekt -- geen eigen Spotify-account en geen privé-namen ingesteld. ` +
        "Kopieer private-rules.example.json daarheen en vul het in."
    );
    return { ownerUserId: null, priveNamePatterns: [] };
  }
  try {
    return parsePrivateRules(JSON.parse(fs.readFileSync(rulesPath, "utf8")));
  } catch (error) {
    console.warn(`[privateRules] ${rulesPath} is geen geldige JSON -- genegeerd.`, error);
    return { ownerUserId: null, priveNamePatterns: [] };
  }
}
