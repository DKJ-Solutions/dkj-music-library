// GET /api/mirror/status -- loopt er een spiegel (#145), hoe eindigde de laatste, en wanneer was de laatste
// geslaagde. De pagina vraagt dit op zolang er een spiegel loopt.
import { NextResponse } from "next/server";
import { readMirrorState } from "@/lib/mirror/mirrorConfig";
import { getMirrorRunStatus } from "@/lib/mirror/mirrorRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ...getMirrorRunStatus(), lastSuccessAt: readMirrorState().lastSuccessAt });
}
