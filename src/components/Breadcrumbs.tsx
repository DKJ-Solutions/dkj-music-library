// De breadcrumb-balk van de huisstijl ("Page patterns", "Every page: the breadcrumb bar"), op elke
// pagina direct onder de site-header: het pad begint bij Home, elke volgende kruimel is een niveau
// dieper, en de laatste is de huidige pagina, zonder link. Client Component, want het pad komt uit
// usePathname() -- de layout zelf krijgt het niet mee. De namen komen uit src/lib/pages.ts, plus de
// namen uit data (`titles`, de mix-detailpagina's en de werkbakken onder Preparation) die de layout op de server leest.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { breadcrumbTrail } from "@/lib/pages";

export default function Breadcrumbs({ titles }: { titles?: Record<string, string> }) {
  const trail = breadcrumbTrail(usePathname(), titles);
  return (
    <div className="breadcrumbs-bar">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Kruimelpad">
          <ol>
            {trail.map((crumb, i) => {
              const current = i === trail.length - 1;
              return (
                <li key={crumb.href}>
                  {i > 0 && (
                    <span className="breadcrumbs__sep" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          fillRule="evenodd"
                          d="M9.793 16.707a1 1 0 0 1 0-1.414L13.086 12 9.793 8.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                  {current ? (
                    <span aria-current="page">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href}>{crumb.label}</Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
