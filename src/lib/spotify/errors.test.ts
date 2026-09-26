// De drie foutklassen: vooral het onderscheid via `instanceof`/`name` en de defaults die de
// aanroepers (auth.ts, route handlers) op vertrouwen.
import { describe, expect, it } from "vitest";
import {
  SpotifyApiError,
  SpotifyConfigError,
  SpotifyReauthRequiredError,
  SpotifyTokenExchangeError,
  spotifyErrorMessage,
} from "./errors";

describe("SpotifyConfigError", () => {
  it("is een Error met de eigen naam en meegegeven message", () => {
    const err = new SpotifyConfigError("iets ontbreekt");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SpotifyConfigError");
    expect(err.message).toBe("iets ontbreekt");
  });
});

describe("SpotifyReauthRequiredError", () => {
  it("heeft een zinnige default-message zonder argument", () => {
    const err = new SpotifyReauthRequiredError();
    expect(err.name).toBe("SpotifyReauthRequiredError");
    expect(err.message).toMatch(/log opnieuw in/i);
  });

  it("accepteert een eigen message", () => {
    const err = new SpotifyReauthRequiredError("Nog niet ingelogd bij Spotify.");
    expect(err.message).toBe("Nog niet ingelogd bij Spotify.");
  });
});

describe("SpotifyTokenExchangeError", () => {
  it("bewaart status en body naast de message", () => {
    const body = { error: "server_error" };
    const err = new SpotifyTokenExchangeError("Spotify token-endpoint gaf 500 terug", 500, body);

    expect(err.name).toBe("SpotifyTokenExchangeError");
    expect(err.status).toBe(500);
    expect(err.body).toEqual(body);
  });
});

describe("SpotifyApiError", () => {
  it("bewaart status en body naast de message", () => {
    const body = { error: { status: 403, message: "insufficient scope" } };
    const err = new SpotifyApiError("Spotify API gaf 403 terug op /me/playlists", 403, body);

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SpotifyApiError");
    expect(err.status).toBe(403);
    expect(err.body).toEqual(body);
  });
});

// Bestaat vanwege 48 mislukte schrijfacties waarbij de hub *"waarschijnlijk geen playlist van jezelf"*
// meldde, terwijl Spotify iets veel bruikbaarders had gezegd. Zie de kop bij spotifyErrorMessage.
describe("spotifyErrorMessage", () => {
  it("leest het geneste foutobject van de Web API", () => {
    const body = { error: { status: 403, message: "Insufficient client scope" } };
    expect(spotifyErrorMessage(body)).toBe("Insufficient client scope");
  });

  it("leest PLATTE TEKST -- precies het geval dat eerder verloren ging", () => {
    // Dit is letterlijk wat Spotify antwoordde, en het was de enige aanwijzing naar de oorzaak.
    const tekst = "The user is not registered for this application. Please check your settings on https://developer.spotify.com/dashboard.";
    expect(spotifyErrorMessage(tekst)).toBe(tekst);
  });

  it("leest de auth-stijl met error_description", () => {
    const body = { error: "invalid_grant", error_description: "Refresh token revoked" };
    expect(spotifyErrorMessage(body)).toBe("Refresh token revoked");
  });

  it("valt bij de auth-stijl terug op de kale code als de omschrijving ontbreekt", () => {
    expect(spotifyErrorMessage({ error: "invalid_grant" })).toBe("invalid_grant");
  });

  it("levert null als er niets leesbaars in staat", () => {
    expect(spotifyErrorMessage(null)).toBeNull();
    expect(spotifyErrorMessage(undefined)).toBeNull();
    expect(spotifyErrorMessage("")).toBeNull();
    expect(spotifyErrorMessage("   ")).toBeNull();
    expect(spotifyErrorMessage({})).toBeNull();
    expect(spotifyErrorMessage({ error: {} })).toBeNull();
    expect(spotifyErrorMessage({ error: { message: "  " } })).toBeNull();
  });

  it("trimt witruimte, zodat de melding netjes in een zin past", () => {
    expect(spotifyErrorMessage({ error: { message: "  iets mis  " } })).toBe("iets mis");
  });
});
