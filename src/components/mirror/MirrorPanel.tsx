"use client";
// De bediening van de desktop-mirror (#145): de twee schijven en de laatste spiegel, de knop Dry run, wat die zou
// kopiëren en verwijderen, en pas dan de knop die spiegelt. Die knop stuurt de vingerafdruk van precies deze dry
// run mee; de server spiegelt alleen als een verse dry run hetzelfde zou doen (lib/mirror/mirrorRunner.ts).
import { useEffect, useState } from "react";
import { readRouteErrorMessage } from "@/lib/http/routeError";
import type { MirrorRunStatus, MirrorSummary } from "@/lib/mirror/mirrorRunner";
import type { MirrorEntry } from "@/lib/mirror/robocopyPlan";

const nf = new Intl.NumberFormat("nl-NL");
const when = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "nog nooit";

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await readRouteErrorMessage(res)) ?? `status ${res.status}`);
  return (await res.json()) as T;
}

function EntryList({ title, entries, total, empty }: { title: string; entries: MirrorEntry[]; total: number; empty: string }) {
  return (
    <section className="card">
      <div className="card__head">
        <h3 className="card__title">{`${title} (${nf.format(total)})`}</h3>
      </div>
      {total === 0 ? (
        <p className="empty-note">{empty}</p>
      ) : (
        <ul className="mirror-list">
          {entries.map((entry) => (
            <li key={`${entry.label}${entry.path}`}>
              <span className="mirror-list__label">{entry.label}</span> <code>{entry.path}</code>
            </li>
          ))}
          {total > entries.length && <li className="mirror-list__more">{`en nog ${nf.format(total - entries.length)}`}</li>}
        </ul>
      )}
    </section>
  );
}

/** De regel naast de knoppen: een fout, een lopende spiegel, een weigering of de uitkomst. */
function statusText(error: string | null, run: MirrorRunStatus, summary: MirrorSummary | null): string {
  if (error) return error;
  if (run.running) return `Spiegel loopt sinds ${when(run.startedAt)}…`;
  if (summary) {
    if (summary.counts.reserveNewer > 0) {
      return `${nf.format(summary.counts.reserveNewer)} bestand(en) zijn op de reserve nieuwer: er is op de reserve gewerkt. De spiegel weigert.`;
    }
    if (summary.counts.copies + summary.counts.deletions === 0) return "De reserve is al gelijk aan de werkschijf.";
    return "";
  }
  if (run.result === "ok") return `Gespiegeld om ${when(run.finishedAt)}.`;
  return run.result ?? "";
}

export function MirrorPanel({
  working,
  reserve,
  lastSuccessAt: initialLastSuccess,
  initialRun,
}: {
  working: string | null;
  reserve: string | null;
  lastSuccessAt: string | null;
  initialRun: MirrorRunStatus;
}) {
  const [summary, setSummary] = useState<MirrorSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<MirrorRunStatus>(initialRun);
  const [lastSuccessAt, setLastSuccessAt] = useState(initialLastSuccess);

  // Zolang er een spiegel loopt: elke twee seconden de stand vragen.
  useEffect(() => {
    if (!run.running) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/mirror/status", { cache: "no-store" });
        const status = (await res.json()) as MirrorRunStatus & { lastSuccessAt: string | null };
        setRun(status);
        setLastSuccessAt(status.lastSuccessAt);
      } catch {
        // De volgende poging probeert het opnieuw.
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [run.running]);

  async function dryRun() {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      setSummary(await post<MirrorSummary>("/api/mirror/dry-run"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "onbekende fout");
    } finally {
      setBusy(false);
    }
  }

  async function mirror() {
    if (!summary) return;
    setBusy(true);
    setError(null);
    try {
      await post("/api/mirror/run", { digest: summary.digest });
      setRun({ running: true, startedAt: new Date().toISOString(), finishedAt: null, result: null });
      setSummary(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "onbekende fout");
    } finally {
      setBusy(false);
    }
  }

  const blocked = summary !== null && summary.counts.reserveNewer > 0;
  const canMirror = summary !== null && !blocked && summary.counts.copies + summary.counts.deletions > 0;
  const failed = error !== null || blocked || (!summary && run.result !== null && run.result !== "ok");

  return (
    <>
      <section className="card">
        <dl className="facts facts--row">
          <div><dt>Werkschijf</dt><dd>{working || "niet ingesteld"}</dd></div>
          <div><dt>Reserveschijf</dt><dd>{reserve || "niet ingesteld"}</dd></div>
          <div><dt>Laatste spiegel</dt><dd>{when(lastSuccessAt)}</dd></div>
        </dl>
        <div className="mirror-actions">
          <button type="button" className="btn" disabled={busy || run.running} onClick={() => void dryRun()}>
            {busy && !summary ? "Dry run loopt…" : "Dry run"}
          </button>
          {canMirror && (
            <button type="button" className="btn btn--primary" disabled={busy || run.running} onClick={() => void mirror()}>
              {`Spiegelen: ${nf.format(summary.counts.copies)} kopiëren, ${nf.format(summary.counts.deletions)} verwijderen`}
            </button>
          )}
          <span className={`mirror-status${failed ? " is-error" : ""}`} role="status">
            {statusText(error, run, summary)}
          </span>
        </div>
      </section>

      {summary && (
        <div className={blocked ? "grid-3" : "grid-2"}>
          <EntryList title="Kopiëren" entries={summary.copies} total={summary.counts.copies} empty="Niets te kopiëren." />
          <EntryList title="Verwijderen" entries={summary.deletions} total={summary.counts.deletions} empty="Niets te verwijderen." />
          {blocked && <EntryList title="Nieuwer op reserve" entries={summary.reserveNewer} total={summary.counts.reserveNewer} empty="" />}
        </div>
      )}
    </>
  );
}
