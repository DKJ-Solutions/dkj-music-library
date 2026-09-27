// Geeft elk nummer uit de Spotify-snapshot (data/spotify/snapshot.json) een eigen ID in de
// trackdatabase: T000001, T000002, ... Releasevarianten van hetzelfde nummer krijgen hetzelfde ID.
//
//   npm run library:assign-ids
//
// De sync op /spotify doet dit na elke run zelf; dit script is er voor een bestaande snapshot, of om
// het los na te lopen. Opnieuw draaien is veilig: wat al een ID heeft, houdt dat. Hoe het werkt staat
// in src/lib/library/trackIds.ts.
import { openLibraryDb } from "../../src/lib/library/db";
import { applyTrackIdsFromSnapshot } from "../../src/lib/library/trackIds";
import { countTracks } from "../../src/lib/library/trackStore";
import { readSnapshot } from "../../src/lib/spotify/snapshotStore";

const snapshot = readSnapshot();
if (!snapshot) {
  console.error("Geen snapshot gevonden -- start eerst een sync op /spotify.");
  process.exit(1);
}

try {
  const { db } = openLibraryDb();
  const { newTracks, newLinks, totalLinks } = applyTrackIdsFromSnapshot(db, snapshot);
  console.log(
    `${newTracks} nieuwe nummers, ${newLinks} Spotify-ID's gekoppeld -- ` +
      `${countTracks(db)} tracks, ${totalLinks} Spotify-ID's in totaal`
  );
  db.close();
} catch (err) {
  console.error(`Toekennen mislukt: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
