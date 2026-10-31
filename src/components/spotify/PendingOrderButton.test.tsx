// @vitest-environment jsdom
// PendingOrderButton.tsx: de knop die een uitgestelde volgorde naar Spotify stuurt. Getoetst wordt wat hij
// beslist: geblokkeerd tot het einde van de rate limit (en dan vanzelf klaar), het contract met de sync-route,
// en de conflictstand met alleen weggooien.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingOrderButton } from "./PendingOrderButton";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const PROPS = { playlistId: "P".repeat(22), moveCount: 3, conflict: false, rateLimitedUntil: null };

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Partial<Response>>;
function mockFetch(impl: FetchMock) {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy);
  return spy;
}
const reply = (status: number, body: unknown): Partial<Response> => ({
  ok: status < 300,
  status,
  json: async () => body,
  clone() {
    return reply(status, body) as Response;
  },
  text: async () => JSON.stringify(body),
});

beforeEach(() => refresh.mockClear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PendingOrderButton", () => {
  it("toont de afwijking en een klare knop zonder rate limit", () => {
    render(<PendingOrderButton {...PROPS} />);
    expect(screen.getByText("3 verplaatsingen nog niet in Spotify")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Volgorde naar Spotify sturen" })).toBeEnabled();
  });

  it("is geblokkeerd zolang de rate limit loopt, noemt het tijdstip en gaat vanzelf aan als dat voorbij is", () => {
    vi.useFakeTimers();
    const now = Date.now();
    render(<PendingOrderButton {...PROPS} rateLimitedUntil={now + 60_000} />);
    expect(screen.getByText(/Sync kan vanaf \d{2}:\d{2}/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Volgorde naar Spotify sturen" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(60_001);
    });
    expect(screen.getByRole("button", { name: "Volgorde naar Spotify sturen" })).toBeEnabled();
    expect(screen.queryByText(/Sync kan vanaf/)).toBeNull();
  });

  it("stuurt de playlist-id naar de sync-route en ververst de pagina bij succes", async () => {
    const spy = mockFetch(async () => reply(200, { synced: true, moves: 2, refreshed: true }));
    render(<PendingOrderButton {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: "Volgorde naar Spotify sturen" }));
    await screen.findByText("Naar Spotify gestuurd (2 verplaatsingen).");
    expect(spy.mock.calls[0][0]).toBe("/api/spotify/playlist-order/sync");
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({ playlistId: PROPS.playlistId });
    expect(refresh).toHaveBeenCalled();
  });

  it("wordt weer geblokkeerd als de server een rate limit meldt", async () => {
    mockFetch(async () => reply(503, { error: "rate_limited", message: "later", rateLimitedUntil: Date.now() + 3_600_000 }));
    render(<PendingOrderButton {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: "Volgorde naar Spotify sturen" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Volgorde naar Spotify sturen" })).toBeDisabled());
    expect(screen.getByText(/Sync kan vanaf/)).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("meldt een fout van de server", async () => {
    mockFetch(async () => reply(500, { error: "sync_failed", message: "Versturen mislukt." }));
    render(<PendingOrderButton {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: "Volgorde naar Spotify sturen" }));
    await screen.findByText(/Versturen mislukt: Versturen mislukt\./);
  });

  it("toont bij een conflict alleen weggooien, en gooit weg via DELETE", async () => {
    const spy = mockFetch(async () => reply(200, { discarded: true }));
    render(<PendingOrderButton {...PROPS} conflict />);
    expect(screen.queryByRole("button", { name: "Volgorde naar Spotify sturen" })).toBeNull();
    expect(screen.getByText(/lokale volgorde past er niet meer op/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lokale volgorde weggooien" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(spy.mock.calls[0][0]).toBe("/api/spotify/playlist-order");
    expect(spy.mock.calls[0][1]?.method).toBe("DELETE");
  });

  it("gaat naar de conflictstand als de sync-route pending_conflict meldt", async () => {
    mockFetch(async () => reply(409, { error: "pending_conflict", message: "Spotify wijkt af." }));
    render(<PendingOrderButton {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: "Volgorde naar Spotify sturen" }));
    await screen.findByRole("button", { name: "Lokale volgorde weggooien" });
  });
});
