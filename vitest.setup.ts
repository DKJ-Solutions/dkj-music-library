// Globale test-setup. De jest-dom-matchers zijn onschadelijk in de node-omgeving (ze worden
// alleen daadwerkelijk gebruikt in de jsdom-componenttests) — vandaar dat dit bestand voor
// alle tests geldt in plaats van los per componenttest te importeren.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library ruimt de jsdom-DOM niet vanzelf op tussen tests zonder een test-
// framework-integratie (die Vitest niet automatisch detecteert) — expliciet afhandelen.
afterEach(() => {
  cleanup();
});
