// Globale test-setup. De jest-dom-matchers zijn onschadelijk in de node-omgeving (ze worden
// alleen daadwerkelijk gebruikt in de jsdom-componenttests) — vandaar dat dit bestand voor
// alle tests geldt in plaats van los per componenttest te importeren.
import "@testing-library/jest-dom/vitest";
import os from "os";
import path from "path";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library ruimt de jsdom-DOM niet vanzelf op tussen tests zonder een test-
// framework-integratie (die Vitest niet automatisch detecteert) — expliciet afhandelen.
afterEach(() => {
  cleanup();
});

// httpClient legt een lange rate limit vast in een bestand; zonder deze omleiding zou een test met een
// Retry-After van uren in de echte data/spotify/ schrijven en de app van de ontwikkelaar op slot zetten.
process.env.SPOTIFY_RATE_LIMIT_STORE_PATH = path.join(
  os.tmpdir(),
  `dkj-test-rate-limit-${process.pid}-${Math.random().toString(36).slice(2)}.json`
);

// De bibliotheek-export staat op een machine met OneDrive in OneDrive (getLibraryExportDir in
// src/lib/library/libraryFile.ts). Een test die zonder eigen map exporteert, zou daar de echte
// bibliotheek overschrijven -- en OneDrive zet dat door naar je andere machines.
process.env.LIBRARY_EXPORT_DIR = path.join(
  os.tmpdir(),
  `dkj-test-library-export-${process.pid}-${Math.random().toString(36).slice(2)}`
);
