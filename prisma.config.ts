/**
 * Prisma configuration for local development.
 * 
 * IMPORTANT: This configuration is for LOCAL DEVELOPMENT ONLY.
 * 
 * In production (Cloudflare Workers), we use the D1 adapter directly:
 *   new PrismaClient({ adapter: new PrismaD1(db) })
 * 
 * The D1 binding is handled by Wrangler via wrangler.toml,
 * so production does NOT use a connection string.
 * 
 * Local dev workflow:
 *   1. npx prisma generate    # Generate client from schema
 *   2. npx prisma db push   # Push schema to local dev.db
 *   3. Run your worker with: npx wrangler dev
 */

// Change this:
// import { defineConfig } from 'prisma'; 

// To this:
import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma', // Explicitly tell it where your schema is
  datasource: {
    // Local dev only - uses SQLite file
    // Production exclusively uses D1 adapter via wrangler.toml
    url: 'file:./dev.db',
  },
});
