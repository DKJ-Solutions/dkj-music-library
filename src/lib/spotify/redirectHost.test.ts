// redirectHost: de host-val die de login op "state komt niet overeen" liet stranden (zie de kop van
// redirectHost.ts). De scenario's zijn de echte: `localhost` in de adresbalk tegen een redirect-URI op
// `127.0.0.1`, en de gevallen waarin er juist NIET gewaarschuwd mag worden.
import { describe, expect, it } from "vitest";
import { findRedirectHostMismatch } from "./redirectHost";

const REDIRECT = "http://127.0.0.1:3000/api/auth/callback/spotify";

describe("findRedirectHostMismatch", () => {
  it("meldt het echte geval: geopend op localhost, callback op 127.0.0.1", () => {
    const hit = findRedirectHostMismatch("localhost:3000", REDIRECT, "/spotify");

    expect(hit).not.toBeNull();
    expect(hit!.browserHost).toBe("localhost");
    expect(hit!.redirectHost).toBe("127.0.0.1");
    expect(hit!.correctUrl).toBe("http://127.0.0.1:3000/spotify");
  });

  it("zwijgt als de host al goed staat", () => {
    expect(findRedirectHostMismatch("127.0.0.1:3000", REDIRECT, "/spotify")).toBeNull();
  });

  it("laat een afwijkende port ongemoeid -- cookies zijn host-gebonden zonder port", () => {
    // Deze check bestaat voor het cookie-probleem, en dáár doet de port niet aan mee. Zou hij wél
    // meewegen, dan verscheen er een waarschuwing voor iets wat de login niet breekt.
    expect(findRedirectHostMismatch("127.0.0.1:3001", REDIRECT)).toBeNull();
  });

  it("vergelijkt hostnamen case-insensitive", () => {
    expect(findRedirectHostMismatch("127.0.0.1", REDIRECT)).toBeNull();
    expect(findRedirectHostMismatch("LOCALHOST:3000", "http://localhost:3000/cb")).toBeNull();
  });

  it("herkent IPv6 als dezelfde host, ondanks de haakjes in de URL", () => {
    expect(findRedirectHostMismatch("[::1]:3000", "http://[::1]:3000/api/auth/callback/spotify")).toBeNull();
  });

  it("ziet [::1] en 127.0.0.1 wél als verschillende hosts", () => {
    // Twee loopback-adressen, maar voor een browser-cookie twee verschillende hosts -- dus dezelfde val.
    // De IPv6-hostnaam houdt zijn haakjes (zo levert `URL` hem), en dat is ook hoe je hem intypt.
    const hit = findRedirectHostMismatch("[::1]:3000", REDIRECT);
    expect(hit?.browserHost).toBe("[::1]");
    expect(hit?.redirectHost).toBe("127.0.0.1");
  });

  it("zwijgt bij een ontbrekende of onleesbare host -- geen valse alarmen", () => {
    expect(findRedirectHostMismatch(null, REDIRECT)).toBeNull();
    expect(findRedirectHostMismatch("", REDIRECT)).toBeNull();
    expect(findRedirectHostMismatch("::niet eens een host::", REDIRECT)).toBeNull();
  });

  it("zwijgt bij een onleesbare redirect-URI", () => {
    expect(findRedirectHostMismatch("localhost:3000", "geen-url")).toBeNull();
    expect(findRedirectHostMismatch("localhost:3000", "")).toBeNull();
  });

  it("bouwt correctUrl uit de redirect-URI, niet uit de meegestuurde host", () => {
    // De Host-header is door de client te beïnvloeden; die mag dus nooit bepalen waar de app naartoe
    // wijst. De origin komt uitsluitend uit de server-side geconfigureerde redirect-URI.
    const hit = findRedirectHostMismatch("evil.example.com", REDIRECT, "/spotify");
    expect(hit!.correctUrl).toBe("http://127.0.0.1:3000/spotify");
  });

  it("zet een ontbrekende schuine streep voor het pad", () => {
    const hit = findRedirectHostMismatch("localhost:3000", REDIRECT, "spotify");
    expect(hit!.correctUrl).toBe("http://127.0.0.1:3000/spotify");
  });

  it("valt terug op de wortel zonder pad", () => {
    const hit = findRedirectHostMismatch("localhost:3000", REDIRECT);
    expect(hit!.correctUrl).toBe("http://127.0.0.1:3000/");
  });
});

// Sinds de login-route zichzelf op de juiste host zet (api/auth/login/spotify) is deze functie niet
// langer alleen de bron van een waarschuwing maar van een échte redirect. Dat maakt twee eigenschappen
// hard: het doel moet dezelfde route zijn (anders slaat de hop de login over) en er mag geen tweede hop
// volgen (anders is het een lus).
describe("findRedirectHostMismatch -- als bron van de login-hop", () => {
  const LOGIN_PATH = "/api/auth/login/spotify";

  it("wijst terug naar dezelfde route op de juiste host", () => {
    const hit = findRedirectHostMismatch("localhost:3000", REDIRECT, LOGIN_PATH);
    expect(hit!.correctUrl).toBe("http://127.0.0.1:3000/api/auth/login/spotify");
  });

  it("levert géén tweede hop op zodra we op de juiste host staan -- dus geen redirect-lus", () => {
    // Dit ís de terminatie-eis: het doel van de hop moet zelf geen mismatch meer opleveren.
    const doel = findRedirectHostMismatch("localhost:3000", REDIRECT, LOGIN_PATH)!.correctUrl;
    const host = new URL(doel).host;
    expect(findRedirectHostMismatch(host, REDIRECT, LOGIN_PATH)).toBeNull();
  });
});
