import type { Metadata } from "next";
import "@/styles/main.scss";

export const metadata: Metadata = {
  title: "dkj-music-library",
  description:
    "Lokale mirror van de muziekbibliotheek: de Spotify-playlists, en straks de desktop-bibliotheek.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
