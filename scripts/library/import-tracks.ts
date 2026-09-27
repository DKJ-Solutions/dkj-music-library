// Importeert tracks uit een CSV- of JSON-bestand in de trackdatabase (data/library/library.db).
//
//   npm run library:import -- pad/naar/tracks.csv
//
// Opnieuw draaien is veilig: een bestaande track_id wordt bijgewerkt, niet verdubbeld. Faalt één
// rij, dan wordt er niets geschreven en meldt het script welke rij het was.
import { openLibraryDb } from "../../src/lib/library/db";
import { withLibrary } from "../../src/lib/library/libraryFile";
import { readImportFile } from "../../src/lib/library/importFile";
import { countTracks, upsertTracks } from "../../src/lib/library/trackStore";

const file = process.argv[2];
if (!file) {
  console.error("Gebruik: npm run library:import -- <bestand.csv|bestand.json>");
  process.exit(1);
}

try {
  const records = readImportFile(file);
  // Eerst los openen voor het schemaverslag; withLibrary() opent daarna opnieuw en exporteert.
  const { db: schemaDb, schema } = openLibraryDb();
  schemaDb.close();
  for (const key of schema.added) console.log(`nieuwe kolom: ${key}`);
  for (const { from, to } of schema.renamed) console.log(`kolom hernoemd: ${from} -> ${to}`);

  const { inserted, updated, total } = withLibrary((db) => ({ ...upsertTracks(db, records), total: countTracks(db) }));
  console.log(`${inserted} toegevoegd, ${updated} bijgewerkt -- ${total} tracks in totaal`);
  console.log("Export bijgewerkt in data/library/export/ -- commit die map om hem op je andere machines te hebben.");
} catch (err) {
  console.error(`Import mislukt: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
