import { DatabaseNotConfiguredError, databaseUrl, databaseUrlSource } from "@/db";

/**
 * Turns a database failure into something a site owner can act on. Messages
 * never include the connection string or password — only the error code, the
 * driver's message (credentials stripped) and a plain-language fix.
 */
export type DbProblem = { kind: string; code: string; message: string; hint: string };

const scrub = (s: string) => s.replace(/[a-z][a-z0-9+.-]*:\/\/[^\s@/]*@/gi, "postgresql://***@").slice(0, 300);

export function describeDbError(e: unknown): DbProblem {
  const err = (e ?? {}) as { code?: string; message?: string; name?: string };
  const code = String(err.code ?? err.name ?? "UNKNOWN");
  const message = scrub(String(err.message ?? e));
  const m = message.toLowerCase();

  if (e instanceof DatabaseNotConfiguredError || !databaseUrl()) {
    return {
      kind: "not-configured",
      code: "NO_DATABASE_URL",
      message: "No DATABASE_URL (or POSTGRES_URL) environment variable is set for this deployment.",
      hint: "In Vercel → Project → Settings → Environment Variables, add DATABASE_URL for the Production environment (or connect Neon under Storage), then redeploy.",
    };
  }
  if (code === "28P01" || code === "28000" || m.includes("password authentication failed")) {
    return { kind: "auth", code, message, hint: "The username or password in DATABASE_URL is wrong. Copy a fresh connection string from Neon (Dashboard → Connect) into Vercel and redeploy." };
  }
  if (code === "3D000") {
    return { kind: "no-database", code, message, hint: "The database name at the end of DATABASE_URL does not exist. Use the name shown in Neon (usually neondb)." };
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || m.includes("getaddrinfo")) {
    return { kind: "host", code, message, hint: "The host name in DATABASE_URL cannot be found. Check for a typo, spaces or quotes around the value in Vercel." };
  }
  if (code === "ERR_INVALID_URL" || m.includes("invalid url") || m.includes("searchparams")) {
    return { kind: "url", code, message, hint: "DATABASE_URL is not a valid connection string. It must look like postgresql://user:password@host/dbname?sslmode=require" };
  }
  if (m.includes("ssl") || m.includes("certificate") || m.includes("tls")) {
    return { kind: "ssl", code, message, hint: "TLS handshake failed. Keep ?sslmode=require in DATABASE_URL, or set DATABASE_SSL=require." };
  }
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ECONNRESET" || m.includes("timeout") || m.includes("terminated")) {
    return { kind: "unreachable", code, message, hint: "The database did not answer in time. Make sure the Neon project is not suspended or deleted, and try again in a few seconds." };
  }
  if (code === "42501") {
    return { kind: "permission", code, message, hint: "The database user may not create tables. Use the owner role's connection string from Neon." };
  }
  return { kind: "error", code, message, hint: "See Vercel → Logs for the full error. Opening /api/health retries the setup." };
}

/** Where the connection comes from, without exposing credentials. */
export function describeConnection() {
  const url = databaseUrl();
  let host = "";
  let database = "";
  try {
    const u = new URL(url);
    host = u.hostname;
    database = u.pathname.replace(/^\//, "");
  } catch {
    // reported as an invalid URL by describeDbError
  }
  return {
    source: databaseUrlSource(),
    host: host || null,
    database: database || null,
    pooled: host.includes("-pooler"),
    functionRegion: process.env.VERCEL_REGION ?? null,
  };
}
