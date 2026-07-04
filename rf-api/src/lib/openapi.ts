const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "RF Argentina API",
    version: "1.0.0",
    description:
      "API de renta fija argentina con metricas, cashflows, calendario de pagos e importacion a Neon Postgres."
  },
  servers: [
    {
      url: baseUrl,
      description: "Configured API base URL"
    }
  ],
  tags: [
    { name: "Health" },
    { name: "Import" },
    { name: "Assets" },
    { name: "Metrics" },
    { name: "Cashflows" },
    { name: "Calendar" },
    { name: "Stats" }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "IMPORT_SECRET"
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", examples: [false] },
          error: { type: "string" }
        }
      },
      ImportSummary: {
        type: "object",
        properties: {
          ok: { type: "boolean", examples: [true] },
          processed: { type: "integer" },
          errors: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          }
        }
      },
      Asset: {
        type: "object",
        properties: {
          activo: { type: "string", examples: ["AL30"] },
          ticker: { type: ["string", "null"] },
          tipo_data912: { type: ["string", "null"], examples: ["BONDS"] },
          subasset_class: {
            type: ["string", "null"],
            examples: ["HARD_DOLLAR"]
          },
          status: { type: ["string", "null"] },
          source: { type: ["string", "null"] },
          nominal_units: { type: ["number", "null"], examples: [100] },
          total_cashflow_records: { type: ["integer", "null"] },
          source_updated_at: { type: ["string", "null"], format: "date-time" },
          updated_at: { type: ["string", "null"], format: "date-time" }
        }
      },
      MetricLatest: {
        type: "object",
        properties: {
          activo: { type: "string", examples: ["AL30"] },
          estado: { type: ["string", "null"], examples: ["OK"] },
          px: { type: ["number", "null"] },
          tir: { type: ["number", "null"] },
          tir_pct: { type: ["number", "null"] },
          duration: { type: ["number", "null"] },
          modified_duration: { type: ["number", "null"] },
          delta_p_mas_100bps: { type: ["number", "null"] },
          delta_p_menos_100bps: { type: ["number", "null"] },
          next_payment_date: { type: ["string", "null"], format: "date" },
          last_payment_date: { type: ["string", "null"], format: "date" },
          future_cashflows_count: { type: ["integer", "null"] },
          nominal_units: { type: ["number", "null"] },
          updated_at: { type: ["string", "null"], format: "date-time" }
        },
        additionalProperties: false
      },
      Cashflow: {
        type: "object",
        properties: {
          activo: { type: "string", examples: ["AL30"] },
          fecha: { type: "string", format: "date" },
          valor_residual: { type: ["number", "null"] },
          interes: { type: ["number", "null"] },
          capital: { type: ["number", "null"] },
          cupon: { type: ["number", "null"] },
          source_updated_at: { type: ["string", "null"], format: "date-time" },
          updated_at: { type: ["string", "null"], format: "date-time" }
        }
      }
    }
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check basico",
        responses: {
          "200": {
            description: "Servicio disponible"
          }
        }
      }
    },
    "/api/health/db": {
      get: {
        tags: ["Health"],
        summary: "Health check de Neon Postgres",
        responses: {
          "200": { description: "Conexion OK" },
          "500": {
            description: "Conexion fallida",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/rf/stats": {
      get: {
        tags: ["Stats"],
        summary: "Conteos y ultimas actualizaciones",
        responses: { "200": { description: "Stats de la base" } }
      }
    },
    "/api/rf/assets": {
      get: {
        tags: ["Assets"],
        summary: "Listar activos",
        parameters: [
          { name: "tipo_data912", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "source", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": {
            description: "Activos",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Asset" }
                }
              }
            }
          }
        }
      }
    },
    "/api/rf/assets/{activo}": {
      get: {
        tags: ["Assets"],
        summary: "Detalle de un activo",
        parameters: [
          {
            name: "activo",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": { description: "Activo, metricas y resumen de cashflows" },
          "404": { description: "Activo no encontrado" }
        }
      }
    },
    "/api/rf/metrics": {
      get: {
        tags: ["Metrics"],
        summary: "Metricas latest",
        parameters: [
          { name: "estado", in: "query", schema: { type: "string" } },
          { name: "tipo_data912", in: "query", schema: { type: "string" } },
          { name: "subasset_class", in: "query", schema: { type: "string" } },
          {
            name: "tickers",
            in: "query",
            schema: { type: "string" },
            example: "AL30,GD30"
          }
        ],
        responses: {
          "200": {
            description: "Metricas",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/MetricLatest" }
                }
              }
            }
          }
        }
      }
    },
    "/api/rf/cashflows": {
      get: {
        tags: ["Cashflows"],
        summary: "Cashflows por activo y rango",
        parameters: [
          { name: "activo", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
          { name: "only_future", in: "query", schema: { type: "boolean" } }
        ],
        responses: {
          "200": {
            description: "Cashflows",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Cashflow" }
                }
              }
            }
          }
        }
      }
    },
    "/api/rf/calendar": {
      get: {
        tags: ["Calendar"],
        summary: "Calendario global de pagos",
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
          { name: "tipo_data912", in: "query", schema: { type: "string" } },
          { name: "subasset_class", in: "query", schema: { type: "string" } },
          { name: "tickers", in: "query", schema: { type: "string" } }
        ],
        responses: { "200": { description: "Pagos ordenados por fecha" } }
      }
    },
    "/api/rf/calendar/monthly": {
      get: {
        tags: ["Calendar"],
        summary: "Calendario mensual agregado",
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } }
        ],
        responses: { "200": { description: "Totales mensuales" } }
      }
    },
    "/api/rf/upcoming-payments": {
      get: {
        tags: ["Calendar"],
        summary: "Proximos pagos",
        parameters: [
          { name: "tickers", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } }
        ],
        responses: { "200": { description: "Proximos pagos" } }
      }
    },
    "/api/import/rf-metrics": {
      post: {
        tags: ["Import"],
        summary: "Importar metricas latest",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { type: "array", items: { type: "object", additionalProperties: true } },
                  {
                    type: "object",
                    properties: {
                      metrics: {
                        type: "array",
                        items: { type: "object", additionalProperties: true }
                      }
                    }
                  },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { type: "object", additionalProperties: true }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Resumen de importacion",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ImportSummary" }
              }
            }
          },
          "401": { description: "Unauthorized" }
        }
      }
    },
    "/api/import/rf-cashflows": {
      post: {
        tags: ["Import"],
        summary: "Importar cashflows completos",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["instruments"],
                properties: {
                  sync_mode: {
                    type: "string",
                    enum: ["partial", "full_by_asset"]
                  },
                  instruments: {
                    type: "object",
                    additionalProperties: {
                      type: "object",
                      additionalProperties: true
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Resumen de importacion" },
          "401": { description: "Unauthorized" }
        }
      }
    }
  }
} as const;
