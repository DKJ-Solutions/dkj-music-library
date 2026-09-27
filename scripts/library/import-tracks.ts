// Importeert tracks uit een CSV- of JSON-bestand in de trackdatabase (data/library/library.db).
//
//   npm run library:import -- pad/naar/tracks.csv
//
// Opnieuw draaien is veilig: een bestaande track_id wordt bijgewerkt, niet verdubbeld. Faalt één
// rij, dan wordt er niets geschreven en meldt het script welke rij het was.
import { openLibraryDb } from "../../src/lib/library/db";
import { readImportFile } from "../../src/lib/library/importFile";
import { countTracks, upsertTracks } from "../../src/lib/library/trackStore";

const file = process.argv[2];
if (!file) {
  console.error("Gebruik: npm run library:import -- <bestand.csv|bestand.json>");
  process.exit(1);
}

try {
  const records = readImportFile(file);
  const { db, schema } = openLibraryDb();
  for (const key of schema.added) console.log(`nieuwe kolom: ${key}`);
  for (const { from, to } of schema.renamed) console.log(`kolom hernoemd: ${from} -> ${to}`);

  const { inserted, updated } = upsertTracks(db, records);
  console.log(`${inserted} toegevoegd, ${updated} bijgewerkt -- ${countTracks(db)} tracks in totaal`);
  db.close();
} catch (err) {
  console.error(`Import mislukt: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
