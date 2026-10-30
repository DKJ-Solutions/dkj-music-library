// De Login- en Sync-kaart staan sinds #122 op /spotify (sectie Connection); dit adres stuurt daarheen door,
// met de query erbij (?connected / ?error), zodat oude links en bladwijzers blijven werken.
import { redirect } from "next/navigation";

interface ConnectionPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ConnectionPage({ searchParams }: ConnectionPageProps) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
  }
  const qs = query.toString();
  redirect(qs ? `/spotify?${qs}` : "/spotify");
}
