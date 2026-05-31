import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const email = process.argv[2] || 'admin@m4vx.com';
const password = process.argv[3] || 'admin123';
const name = process.argv[4] || 'Admin';

const passwordHash = await bcrypt.hash(password, 12);

const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
if (existing.length > 0) {
  await sql`UPDATE users SET role = 'admin' WHERE email = ${email}`;
  console.log(`Admin role assigned to ${email}`);
} else {
  await sql`
    INSERT INTO users (email, password_hash, name, role)
    VALUES (${email}, ${passwordHash}, ${name}, 'admin')
  `;
  console.log(`Admin user created: ${email} / ${password}`);
}
