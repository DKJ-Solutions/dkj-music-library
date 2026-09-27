// @vitest-environment jsdom
// TrackRegister.tsx: de tabel van /spotify/trackregister. Het filter zelf is getest in register.test.ts;
// hier wat de component beslist: bladeren per 100 rijen, en dat een filter terugspringt naar pagina 1.
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TrackRegister } from "./TrackRegister";
import type { RegisterRow } from "@/lib/library/register";

function row(n: number, over: Partial<RegisterRow> = {}): RegisterRow {
  return {
    id: `ART01-${String(n).padStart(3, "0")}`,
    title: `Nummer ${n}`,
    artistIds: ["ART01"],
    artistNames: ["Artiest"],
    artist: "Artiest",
    albumArtist: "Artiest",
    bpm: null,
    album: null,
    ...over,
  };
}

const bodyRows = () => document.querySelectorAll(".register-table tbody tr");

describe("TrackRegister", () => {
  const rows = [
    ...Array.from({ length: 149 }, (_, i) => row(i + 1)),
    row(150, { bpm: "176BPM", album: "Blue Full (m)" }),
  ];

  it("toont 100 rijen per pagina", () => {
    render(<TrackRegister rows={rows} artistCount={1} />);
    expect(bodyRows()).toHaveLength(100);
    fireEvent.click(screen.getByRole("button", { name: "Volgende" }));
    expect(bodyRows()).toHaveLength(50);
    expect(screen.getByText(/pagina 2 van 2/)).toBeTruthy();
  });

  it("filtert op dkj_bpm en springt terug naar pagina 1", () => {
    render(<TrackRegister rows={rows} artistCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Volgende" }));
    fireEvent.change(screen.getByLabelText(/dkj_bpm/), { target: { value: "176BPM" } });
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("Blue Full (m)")).toBeTruthy();
    expect(screen.getByText("1 van 150 nummers")).toBeTruthy();
  });

  it("meldt het als niets past", () => {
    render(<TrackRegister rows={rows} artistCount={1} />);
    fireEvent.change(screen.getByLabelText(/dkj_album/), { target: { value: "Red Light (f)" } });
    expect(screen.getByText("Geen nummer gevonden met deze zoekterm en filters.")).toBeTruthy();
  });
});
