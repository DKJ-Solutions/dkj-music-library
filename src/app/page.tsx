// De Spotify-mirror is (nog) de enige mirror in deze app, dus de root stuurt daar direct heen. Komt
// de desktop-mirror erbij, dan wordt dit de keuzepagina tussen de twee.
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/spotify");
}
