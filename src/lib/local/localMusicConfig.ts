// Waar de lokale muziekmap staat (#144): de bron van /compare/pc-spotify. In de praktijk de werk-USB-schijf
// met de rekordbox-bibliotheek, dus een pad dat per machine verschilt en niet in deze publieke repo hoort.
//
// Het bestand is data/local/local-music.json (de git-ignored data/-map, zoals private-rules.json), met
// local-music.example.json in de repo-root als voorbeeld. Ontbreekt het, of staat er geen map in, dan is
// er geen map gekoppeld en toont de pagina haar lege melding.
//
// SERVER-ONLY: gebruikt Node's `fs`.
import fs from "fs";
import path from "path";

const DEFAULT_CONFIG_PATH = path.join(process.cwd(), "data", "local", "local-music.json");

export interface LocalMusicConfig {
  /** De map die recursief gescand wordt, of null als er geen is ingesteld. */
  musicFolder: string | null;
}

function getConfigPath(): string {
  const override = process.env.LOCAL_MUSIC_CONFIG_PATH;
  return override ? path.resolve(override) : DEFAULT_CONFIG_PATH;
}

/** Zet de ruwe JSON om naar de instelling. Puur, zodat de validatie los te testen is. */
export function parseLocalMusicConfig(raw: unknown): LocalMusicConfig {
  const input = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const folder = typeof input.musicFolder === "string" ? input.musicFolder.trim() : "";
  return { musicFolder: folder === "" ? null : folder };
}

export function readLocalMusicConfig(): LocalMusicConfig {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return { musicFolder: null };
  try {
    return parseLocalMusicConfig(JSON.parse(fs.readFileSync(configPath, "utf8")));
  } catch (error) {
    console.warn(`[localMusicConfig] ${configPath} is geen geldige JSON -- genegeerd.`, error);
    return { musicFolder: null };
  }
}
