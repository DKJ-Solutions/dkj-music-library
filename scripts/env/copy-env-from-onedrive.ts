// Neemt .env.local over uit OneDrive als de repo er zelf nog geen (ingevulde) heeft.
//
//   npm run env:onedrive        (draait ook vanzelf vóór `npm run dev`, als `predev`)
//
// Waarom en waar vandaan: src/lib/env/onedriveEnv.ts. Faalt nooit -- hooguit een melding.
import path from "path";
import { describeEnvSync, getOneDriveEnvPath, syncEnvFromOneDrive } from "../../src/lib/env/onedriveEnv";

try {
  const message = describeEnvSync(
    syncEnvFromOneDrive(path.resolve(__dirname, "..", "..", ".env.local"), getOneDriveEnvPath())
  );
  if (message) console.log(`[env] ${message}`);
} catch (err) {
  console.warn(`[env] .env.local uit OneDrive overnemen mislukte: ${(err as Error).message}`);
}
