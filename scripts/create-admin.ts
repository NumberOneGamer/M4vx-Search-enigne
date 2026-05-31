import { db } from '../src/db';
import { users } from '../src/db/schema/users';
import { hashPassword } from '../src/lib/auth';
import { eq } from 'drizzle-orm';

const email = process.argv[2] || 'admin@m4vx.com';
const password = process.argv[3] || 'admin123';
const name = process.argv[4] || 'Admin';

async function main() {
  try {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      const [user] = await db.update(users).set({ role: 'admin' }).where(eq(users.email, email)).returning();
      console.log('Admin role assigned:', JSON.stringify(user, null, 2));
    } else {
      const passwordHash = await hashPassword(password);
      const [user] = await db.insert(users).values({ email, passwordHash, name, role: 'admin' }).returning();
      console.log('Admin user created:', JSON.stringify(user, null, 2));
    }
    process.exit(0);
  } catch (e) {
    console.error('Error:', e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
