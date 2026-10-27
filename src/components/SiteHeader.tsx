// De site-header van de huisstijl ("Page patterns", "The site header, above the bar"), op elke pagina
// zoals op de hub: links het merkteken en de naam van de app als link naar de homepagina, rechts de
// instellingenknop -- daar gemount in plaats van zwevend.
import Link from "next/link";
import ThemeSettings from "@/components/ThemeSettings";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container">
        <Link className="site-header__brand" href="/" aria-label="dkj-music-library, home">
          <span className="site-header__mark" aria-hidden="true">DKJ</span>
          <span className="site-header__name">dkj-music-library</span>
        </Link>
        <ThemeSettings />
      </div>
    </header>
  );
}
