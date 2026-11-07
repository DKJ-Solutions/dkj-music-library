// De twee paden van de desktop-mirror (#145) en het moment van de laatste geslaagde spiegel, buiten git: de
// repo is publiek, en welke schijven je hebt hoort daar niet in. Zelfde plek en aanpak als
// spotify/privateRules.ts: data/mirror/config.json (git-ignored), met mirror-config.example.json in de
// repo-root als voorbeeld. De laatste geslaagde spiegel staat ernaast in data/mirror/state.json.
//
// SERVER-ONLY: gebruikt Node's `fs`.
import fs from "fs";
import path from "path";

export interface MirrorConfig {
  /** De werkschijf: de bron van waarheid, bv. "E:\\". */
  working: string;
  /** De reserveschijf: alleen de spiegel, bv. "F:\\". */
  reserve: string;
}

export interface MirrorState {
  /** ISO-tijd van de laatste geslaagde spiegel, of null. */
  lastSuccessAt: string | null;
}

function dir(): string {
  const override = process.env.DKJ_MIRROR_DIR;
  return override ? path.resolve(override) : path.join(process.cwd(), "data", "mirror");
}

export function mirrorConfigPath(): string {
  return path.join(dir(), "config.json");
}

/** Zet de ruwe JSON om; ontbrekende of lege velden worden een lege string (de pagina vraagt dan om ze). */
export function parseMirrorConfig(raw: unknown): MirrorConfig {
  const input = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  return { working: text(input.working), reserve: text(input.reserve) };
}

/** null als er nog geen instelling is. */
export function readMirrorConfig(): MirrorConfig | null {
  try {
    return parseMirrorConfig(JSON.parse(fs.readFileSync(mirrorConfigPath(), "utf8")));
  } catch {
    return null;
  }
}

export function readMirrorState(): MirrorState {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir(), "state.json"), "utf8")) as { lastSuccessAt?: unknown };
    return { lastSuccessAt: typeof raw.lastSuccessAt === "string" ? raw.lastSuccessAt : null };
  } catch {
    return { lastSuccessAt: null };
  }
}

export function writeMirrorState(state: MirrorState): void {
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(path.join(dir(), "state.json"), JSON.stringify(state, null, 2) + "\n");
}
