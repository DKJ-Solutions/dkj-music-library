// POST /api/mirror/dry-run -- de dry run van de desktop-mirror (#145): wat de spiegel zou kopiëren en wat hij op
// de reserve zou verwijderen, zonder iets aan te raken. Zie lib/mirror/mirrorRunner.ts.
import { NextResponse } from "next/server";
import { sameOriginGuard } from "@/lib/http/sameOrigin";
import { dryRunMirror, MirrorRefusal } from "@/lib/mirror/mirrorRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = sameOriginGuard(request);
  if (guard) return guard;
  try {
    return NextResponse.json(await dryRunMirror());
  } catch (err) {
    if (err instanceof MirrorRefusal) return NextResponse.json({ error: "refused", message: err.message }, { status: 409 });
    console.error("[api/mirror/dry-run] mislukt:", err);
    return NextResponse.json({ error: "dry_run_failed", message: "De dry run mislukte. Zie de serverconsole." }, { status: 500 });
  }
}
