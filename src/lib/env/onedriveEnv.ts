// De Spotify-sleutels (.env.local) reizen niet met git mee -- de repo is publiek. Om ze niet bij elke
// verse clone opnieuw uit het Spotify Developer Dashboard te hoeven halen, staat er één bewaarde kopie
// in OneDrive: %OneDrive%\dkj-solutions\dkj-music-library\.env.local. Vóór `npm run dev` (de `predev`
// in package.json, en dus ook de dev-preview-hook) neemt scripts/env/copy-env-from-onedrive.ts die
// over zolang de repo zelf nog geen bruikbare .env.local heeft.
//
// Het pad gaat via de `OneDrive`-variabele die Windows zelf zet, zodat er geen gebruikersnaam in de
// publieke repo staat. Niets hier mag `npm run dev` blokkeren: elke uitkomst is een melding, geen fout.
import fs from "fs";
import path from "path";

export const ONEDRIVE_ENV_SUBPATH = path.join("dkj-solutions", "dkj-music-library", ".env.local");

// De voorbeeldwaarden uit .env.local.example. Een bestand dat ze nog bevat is niet ingevuld: dat
// kopiëren we niet, en een repo-kopie die ze nog bevat mag overschreven worden.
const PLACEHOLDER = /vul-hier-/;

export function hasPlaceholders(text: string): boolean {
  return PLACEHOLDER.test(text);
}

export function getOneDriveEnvPath(env: Record<string, string | undefined> = process.env): string | null {
  const oneDrive = env.OneDrive || env.OneDriveConsumer || env.OneDriveCommercial;
  return oneDrive ? path.join(oneDrive, ONEDRIVE_ENV_SUBPATH) : null;
}

export type EnvSyncResult =
  | { kind: "present" }
  | { kind: "copied"; from: string }
  | { kind: "no-onedrive" }
  | { kind: "source-missing"; from: string }
  | { kind: "source-unfilled"; from: string };

function readIfExists(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/** Neemt de OneDrive-kopie over naar `target`, tenzij daar al een ingevulde .env.local staat. */
export function syncEnvFromOneDrive(target: string, source: string | null): EnvSyncResult {
  const current = readIfExists(target);
  if (current !== null && !hasPlaceholders(current)) return { kind: "present" };
  if (!source) return { kind: "no-onedrive" };

  const saved = readIfExists(source);
  if (saved === null) return { kind: "source-missing", from: source };
  if (hasPlaceholders(saved)) return { kind: "source-unfilled", from: source };

  fs.writeFileSync(target, saved);
  return { kind: "copied", from: source };
}

/** Leest `KEY=waarde`-regels uit een .env-bestand. Commentaar en lege regels vallen weg, aanhalingstekens
 *  rond de waarde ook. Bewust minimaal: alleen voor het herstel hieronder, niet als algemene dotenv. */
export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.endsWith(value[0])) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Het herstel voor #128: `predev` neemt de OneDrive-kopie maar één keer over, en bij het opstarten is
 *  OneDrive vaak nog aan het synchroniseren. Ontbreken de sleutels op het moment dat ze nodig zijn, dan
 *  probeert dit het opnieuw: de kopie overnemen (als de repo er nog geen ingevulde heeft) en de waarden uit
 *  `target` in `env` zetten, alleen voor sleutels die daar nog leeg zijn. Next.js laadt een nieuwe
 *  .env.local zelf ook in, maar pas ná het verzoek dat erom vroeg. Gooit nooit. */
export function recoverEnvFromOneDrive(
  target: string,
  source: string | null,
  env: Record<string, string | undefined> = process.env
): EnvSyncResult {
  let result: EnvSyncResult;
  try {
    result = syncEnvFromOneDrive(target, source);
  } catch {
    return { kind: "no-onedrive" };
  }
  if (result.kind === "present" || result.kind === "copied") {
    const text = readIfExists(target);
    if (text !== null) {
      for (const [key, value] of Object.entries(parseEnvFile(text))) {
        if (!env[key]) env[key] = value;
      }
    }
  }
  return result;
}

export function describeEnvSync(result: EnvSyncResult): string | null {
  switch (result.kind) {
    case "present":
      return null;
    case "copied":
      return `.env.local overgenomen uit OneDrive (${result.from}).`;
    case "no-onedrive":
      return "Geen .env.local en geen OneDrive-map gevonden -- kopieer .env.local.example naar .env.local en vul de Spotify-sleutels in.";
    case "source-missing":
      return `Geen .env.local in de repo en ook niet in OneDrive. Zet je ingevulde .env.local één keer in ${result.from}; daarna neemt elke nieuwe clone hem vanzelf over.`;
    case "source-unfilled":
      return `De .env.local in OneDrive (${result.from}) bevat nog de voorbeeldwaarden -- vul SPOTIFY_CLIENT_ID en SPOTIFY_CLIENT_SECRET daar in en start de app opnieuw.`;
  }
}
