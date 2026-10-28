import { hashPassword } from '../src/auth.js';
import { pool } from '../src/db.js';

const [email, password, name = 'Admin'] = process.argv.slice(2);
if (!email || !password || password.length < 10) {
  console.error('Usage: npm run admin:create -- <email> <password, 10+ characters> [name]');
  process.exit(1);
}

await pool.query(
  `INSERT INTO admin_users (email, name, password_hash) VALUES (?, ?, ?) AS new
   ON DUPLICATE KEY UPDATE name = new.name, password_hash = new.password_hash`,
  [email.trim().toLowerCase(), name, await hashPassword(password)],
);
console.log(`Admin ${email} can now sign in at /admin`);
await pool.end();
