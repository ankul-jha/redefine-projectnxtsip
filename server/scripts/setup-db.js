import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { hashPassword } from '../src/auth.js';
import { config } from '../src/config.js';

const { host, port, user, password, database } = config.db;
const db = await mysql.createConnection({ host, port, user, password, database, multipleStatements: true });

const [[{ tables }]] = await db.query(
  'SELECT COUNT(*) AS tables FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
  [database, 'products'],
);
if (tables === 0) {
  for (const file of ['01-schema.sql', '02-seed.sql']) {
    await db.query(await readFile(new URL(`../db/${file}`, import.meta.url), 'utf8'));
  }
  console.log('Database created with the starter catalog');
}

const { ADMIN_EMAIL: email, ADMIN_PASSWORD: adminPassword } = process.env;
if (email && adminPassword) {
  if (adminPassword.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');
  await db.query(
    `INSERT INTO admin_users (email, name, password_hash) VALUES (?, 'Admin', ?) AS new
     ON DUPLICATE KEY UPDATE password_hash = new.password_hash`,
    [email.trim().toLowerCase(), await hashPassword(adminPassword)],
  );
  console.log(`Admin ${email} can sign in at /admin`);
}

await db.end();
