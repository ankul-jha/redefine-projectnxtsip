import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  enableKeepAlive: true,
  timezone: 'Z',
});

const RETRYABLE_ERRORS = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);

export async function transaction(work, attempts = 3) {
  for (let attempt = 1; ; attempt += 1) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => {});
      if (attempt >= attempts || !RETRYABLE_ERRORS.has(error.code)) throw error;
    } finally {
      connection.release();
    }
  }
}
