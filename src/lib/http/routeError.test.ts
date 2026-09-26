// routeError: de uitleg uit een mislukt antwoord van de eigen routes halen. Bestaat omdat de interface
// bij 48 mislukte schrijfacties één vaste (en onjuiste) verklaring toonde terwijl het antwoord de juiste
// al bevatte -- zie de kop van routeError.ts.
import { describe, expect, it } from "vitest";
import { readRouteErrorMessage } from "./routeError";

function response(body: unknown, init: ResponseInit = { status: 502 }): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), init);
}

describe("readRouteErrorMessage", () => {
  it("leest de message die de route meestuurt", async () => {
    const res = response({
      error: "spotify_error",
      status: 403,
      message:
        "Spotify weigert de wijziging (403): The user is not registered for this application.",
    });
    expect(await readRouteErrorMessage(res)).toContain("not registered for this application");
  });

  it("valt terug op de foutcode als er geen message is -- die zegt nog altijd iets", async () => {
    expect(await readRouteErrorMessage(response({ error: "unknown_playlist" }))).toBe(
      "unknown_playlist"
    );
  });

  it("levert null bij een lichaam zonder bruikbaar veld", async () => {
    expect(await readRouteErrorMessage(response({ status: 500 }))).toBeNull();
    expect(await readRouteErrorMessage(response({ message: "   " }))).toBeNull();
  });

  it("gooit niet op een leeg of niet-JSON antwoord", async () => {
    // Een foutmelding die zélf een fout veroorzaakt laat de oorspronkelijke mislukking verdwijnen.
    expect(await readRouteErrorMessage(response("", { status: 502 }))).toBeNull();
    expect(await readRouteErrorMessage(response("<html>502</html>", { status: 502 }))).toBeNull();
  });

  it("negeert een lichaam dat geen object is", async () => {
    expect(await readRouteErrorMessage(response('"kale string"'))).toBeNull();
    expect(await readRouteErrorMessage(response("null"))).toBeNull();
  });
});
