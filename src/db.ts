import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';
import { config } from './config';

// Amounts are stored in cents as int8 (OID 20); they fit a JS number, so parse them as one.
types.setTypeParser(20, (value) => Number.parseInt(value, 10));

export const pool = new Pool({ connectionString: config.databaseUrl });

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

/** Runs `fn` on one connection between BEGIN and COMMIT; rolls back if it throws. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
