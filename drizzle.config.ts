import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Used by `npm run db:push` / `db:studio`. The app itself creates its tables
// on start-up (see src/db/schema-sql.ts), so this is optional tooling.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
