// Trekt de lokale database (data/library/library.db) en de export (in OneDrive, zie
// getLibraryExportDir in libraryFile.ts) gelijk, en zegt wat het deed:
//
//   npm run library:sync
//
// Handig na een verse kloon, of als OneDrive net een export van je andere machine binnenbracht. Nodig is het niet: elke stap die de bibliotheek opent,
// doet dit zelf. Hoe het werkt staat in src/lib/library/libraryFile.ts.
import { getLibraryExportDir, openLibrary } from "../../src/lib/library/libraryFile";
import { countTracks } from "../../src/lib/library/trackStore";

const MESSAGE = {
  restored: "database opnieuw opgebouwd uit de export",
  exported: "export geschreven uit de database",
  "in-sync": "database en export waren al gelijk",
  empty: "nog geen tracks en geen export -- start een sync op /spotify",
} as const;

try {
  const { db, sync } = openLibrary();
  console.log(`${MESSAGE[sync]} (${countTracks(db)} tracks, export in ${getLibraryExportDir()})`);
  db.close();
} catch (err) {
  console.error(`Gelijktrekken mislukt: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
