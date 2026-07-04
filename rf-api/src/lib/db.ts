import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var rfApiPool: Pool | undefined;
}

export type DbClient = Pool | PoolClient;

type NeonPoolConfig = PoolConfig & {
  enableChannelBinding?: boolean;
};

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!globalThis.rfApiPool) {
    const config: NeonPoolConfig = {
      connectionString,
      enableChannelBinding: connectionString.includes("channel_binding=require"),
      ssl: connectionString.includes("sslmode=disable")
        ? false
        : { rejectUnauthorized: false },
      max: 10
    };

    globalThis.rfApiPool = new Pool(config);
  }

  return globalThis.rfApiPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  return getPool().query<T>(text, params);
}

export async function withClient<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}
