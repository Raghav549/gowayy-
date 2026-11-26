import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import { attachDatabasePool } from "@vercel/functions";

/**
 * Connection string, in order of preference. `DATABASE_URL` is the app's own
 * variable; the others are what Vercel's Postgres integrations (Neon,
 * Supabase, Prisma Postgres) inject, so connecting one in the Vercel dashboard
 * is enough — no manual copying.
 */
const URL_VARS = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"] as const;

/**
 * Undo the usual copy-paste slips when a connection string is pasted into a
 * dashboard: surrounding quotes, Neon's `psql '…'` snippet, or the whole
 * `DATABASE_URL=…` line.
 */
function cleanUrl(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^[A-Z_]+\s*=\s*/, "").trim();
  s = s.replace(/^psql\s+/, "").trim();
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) s = s.slice(1, -1).trim();
  return s;
}

/** Which environment variable the connection string comes from (for diagnostics). */
export function databaseUrlSource(): string | null {
  return URL_VARS.find((k) => cleanUrl(process.env[k] ?? "")) ?? null;
}

export function databaseUrl(): string {
  const key = databaseUrlSource();
  return key ? cleanUrl(process.env[key] ?? "") : "";
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("No database configured. Set DATABASE_URL (or connect a Postgres database to the Vercel project) and redeploy.");
    this.name = "DatabaseNotConfiguredError";
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);

/**
 * Hosted Postgres (Neon, Supabase, RDS…) needs TLS while a local server
 * usually has none. `sslmode` in the URL is honoured; `DATABASE_SSL`
 * (`disable` | `require` | `verify`) overrides everything. `require` encrypts
 * without pinning a CA, which is what managed poolers expect.
 */
function connectionConfig(url: string): PoolConfig {
  let host = "";
  let mode = "";
  let cleaned = url;
  try {
    const u = new URL(url);
    host = u.hostname;
    mode = (u.searchParams.get("sslmode") ?? "").toLowerCase();
    // pg would let URL ssl params override the `ssl` object below.
    for (const k of ["sslmode", "ssl", "uselibpqcompat"]) u.searchParams.delete(k);
    cleaned = u.toString();
  } catch {
    // Unusual URL (e.g. unescaped characters in the password): let pg parse it as-is.
  }
  const env = (process.env.DATABASE_SSL ?? "").toLowerCase();
  const local = LOCAL_HOSTS.has(host) || host.endsWith(".local") || (!!host && !host.includes("."));
  let ssl: PoolConfig["ssl"];
  if (env === "disable" || env === "false" || (!env && mode === "disable")) ssl = false;
  else if (env === "verify" || (!env && (mode === "verify-full" || mode === "verify-ca"))) ssl = { rejectUnauthorized: true };
  else if (env === "require" || env === "true" || mode || !local) ssl = { rejectUnauthorized: false };
  else ssl = false;

  const serverless = !!process.env.VERCEL;
  return {
    connectionString: cleaned,
    ssl,
    // Serverless instances each hold their own pool: keep it small and short-lived.
    max: Number(process.env.DATABASE_POOL_MAX) || (serverless ? 5 : 10),
    idleTimeoutMillis: serverless ? 5_000 : 30_000,
    connectionTimeoutMillis: 15_000,
  };
}

function createPool(): Pool {
  const url = databaseUrl();
  if (!url) {
    // Importing this module must never throw — `next build` loads every route
    // to collect its config, and there may be no database at build time.
    // Queries fail with a clear message instead.
    const pool = new Pool();
    const fail = (...args: unknown[]) => {
      const err = new DatabaseNotConfiguredError();
      const cb = args.find((a) => typeof a === "function") as ((e: Error) => void) | undefined;
      if (cb) return void cb(err);
      return Promise.reject(err);
    };
    Object.assign(pool, { connect: fail, query: fail });
    return pool;
  }
  const pool = new Pool(connectionConfig(url));
  // An idle client erroring (e.g. the server closed it) must not crash the process.
  pool.on("error", (err) => console.error("[db] idle client error:", err.message));
  // On Vercel Fluid compute this releases idle clients before an instance is suspended.
  attachDatabasePool(pool);
  return pool;
}

const globalForDb = globalThis as typeof globalThis & { __gowayyPool?: Pool };

// Reused across hot reloads in dev and across requests within one serverless instance.
export const pool = (globalForDb.__gowayyPool ??= createPool());

export const db = drizzle(pool);
