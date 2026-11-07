// POST /api/mirror/run -- start de echte spiegel van de desktop-mirror (#145), alleen voor de dry run die je net
// hebt goedgekeurd. Body: { digest } (uit de dry run). Antwoordt zodra robocopy loopt; de voortgang staat op
// GET /api/mirror/status. Waarom en wanneer hij weigert: lib/mirror/mirrorRunner.ts.
import { NextResponse } from "next/server";
import { sameOriginGuard } from "@/lib/http/sameOrigin";
import { MirrorRefusal, startMirror } from "@/lib/mirror/mirrorRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = sameOriginGuard(request);
  if (guard) return guard;
  const body = (await request.json().catch(() => null)) as { digest?: unknown } | null;
  const digest = typeof body?.digest === "string" ? body.digest : "";
  if (!digest) return NextResponse.json({ error: "bad_request", message: "Doe eerst een dry run." }, { status: 400 });
  try {
    await startMirror(digest);
    return NextResponse.json({ started: true });
  } catch (err) {
    if (err instanceof MirrorRefusal) return NextResponse.json({ error: "refused", message: err.message }, { status: 409 });
    console.error("[api/mirror/run] mislukt:", err);
    return NextResponse.json({ error: "run_failed", message: "De spiegel kon niet starten. Zie de serverconsole." }, { status: 500 });
  }
}
