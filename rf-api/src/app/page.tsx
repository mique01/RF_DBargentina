const endpointGroups = [
  {
    title: "Health",
    endpoints: [
      ["GET", "/api/health", "Estado basico del servicio"],
      ["GET", "/api/health/db", "Conexion a Neon Postgres"]
    ]
  },
  {
    title: "Import",
    endpoints: [
      ["POST", "/api/import/rf-metrics", "Importar metricas latest"],
      ["POST", "/api/import/rf-cashflows", "Importar cashflows por activo"]
    ]
  },
  {
    title: "Assets",
    endpoints: [
      ["GET", "/api/rf/assets", "Listado y filtros"],
      ["GET", "/api/rf/assets/{activo}", "Detalle por activo"]
    ]
  },
  {
    title: "Metrics",
    endpoints: [["GET", "/api/rf/metrics", "Metricas latest"]]
  },
  {
    title: "Cashflows",
    endpoints: [["GET", "/api/rf/cashflows", "Pagos por activo y fecha"]]
  },
  {
    title: "Calendar",
    endpoints: [
      ["GET", "/api/rf/calendar", "Calendario global"],
      ["GET", "/api/rf/calendar/monthly", "Agregado mensual"],
      ["GET", "/api/rf/upcoming-payments", "Proximos pagos"]
    ]
  },
  {
    title: "Stats",
    endpoints: [["GET", "/api/rf/stats", "Conteos y ultimas actualizaciones"]]
  }
];

const quickLinks = [
  ["/docs", "Docs"],
  ["/api/openapi.json", "OpenAPI JSON"],
  ["/api/health", "Health"],
  ["/api/health/db", "DB health"],
  ["/api/rf/stats", "Stats"]
];

export default function Home() {
  return (
    <main className="api-shell">
      <div className="api-container">
        <section className="hero">
          <h1 className="hero-title">
            RF Argentina API <span className="version-pill">v1.0.0</span>
          </h1>
          <p className="hero-copy">
            API de renta fija argentina con metricas, cashflows, calendario de
            pagos e importacion a Neon Postgres.
          </p>
          <nav className="quick-links" aria-label="Links principales">
            {quickLinks.map(([href, label]) => (
              <a className="quick-link" href={href} key={href}>
                {label}
              </a>
            ))}
          </nav>
        </section>

        {endpointGroups.map((group) => (
          <section className="endpoint-section" key={group.title}>
            <h2 className="section-title">{group.title}</h2>
            <div className="endpoint-list">
              {group.endpoints.map(([method, path, note]) => (
                <a className="endpoint-row" href={path} key={`${method}-${path}`}>
                  <span
                    className={`method ${
                      method === "GET" ? "method-get" : "method-post"
                    }`}
                  >
                    {method}
                  </span>
                  <span className="path">{path}</span>
                  <span className="endpoint-note">{note}</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
