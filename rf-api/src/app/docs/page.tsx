"use client";

import { useEffect, useMemo, useState } from "react";

type Operation = {
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: unknown;
  security?: unknown;
};

type OpenApiSpec = {
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, Record<string, Operation>>;
};

type DocOperation = {
  method: string;
  path: string;
  operation: Operation;
};

const methodClass: Record<string, string> = {
  get: "method-get",
  post: "method-post"
};

export default function DocsPage() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/openapi.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`OpenAPI request failed: ${response.status}`);
        }

        return response.json();
      })
      .then((data: OpenApiSpec) => setSpec(data))
      .catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  const operations = useMemo(() => {
    if (!spec) {
      return [] as DocOperation[];
    }

    return Object.entries(spec.paths).flatMap(([path, methods]) =>
      Object.entries(methods).map(([method, operation]) => ({
        method,
        path,
        operation
      }))
    );
  }, [spec]);

  const grouped = useMemo(() => {
    return operations.reduce<Record<string, DocOperation[]>>((acc, item) => {
      const tag = item.operation.tags?.[0] ?? "Other";
      acc[tag] = [...(acc[tag] ?? []), item];
      return acc;
    }, {});
  }, [operations]);

  return (
    <main className="api-shell">
      <div className="api-container">
        <section className="hero">
          <h1 className="hero-title">
            RF Argentina API <span className="version-pill">docs</span>
          </h1>
          <p className="hero-copy">
            Documentacion interactiva generada desde OpenAPI. Abrir cada fila
            para ver parametros, seguridad, request body y respuestas.
          </p>
          <nav className="docs-toolbar" aria-label="Links de documentacion">
            <a className="quick-link" href="/">
              Home
            </a>
            <a className="quick-link" href="/api/openapi.json">
              OpenAPI JSON
            </a>
            <a className="quick-link" href="/api/health">
              Health
            </a>
            <a className="quick-link" href="/api/rf/stats">
              Stats
            </a>
          </nav>
        </section>

        {error ? <p className="subtle">{error}</p> : null}
        {!spec && !error ? <p className="subtle">Cargando OpenAPI...</p> : null}

        {Object.entries(grouped).map(([tag, items]) => (
          <section className="endpoint-section" key={tag}>
            <h2 className="section-title">{tag}</h2>
            <div className="docs-grid">
              {items.map(({ method, path, operation }) => (
                <details className="doc-card" key={`${method}-${path}`}>
                  <summary className="doc-summary">
                    <span className={`method ${methodClass[method] ?? ""}`}>
                      {method.toUpperCase()}
                    </span>
                    <span className="path">{path}</span>
                  </summary>
                  <div className="doc-body">
                    <h3>{operation.summary ?? path}</h3>
                    {operation.description ? <p>{operation.description}</p> : null}
                    <a className="quick-link" href={path.replace("{activo}", "AL30")}>
                      Abrir endpoint
                    </a>
                    <pre>
                      {JSON.stringify(
                        {
                          parameters: operation.parameters ?? [],
                          security: operation.security ?? [],
                          requestBody: operation.requestBody ?? null,
                          responses: operation.responses ?? {}
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
