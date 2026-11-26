import { getCurrentUser } from "@/lib/auth";

export const ok = (d: Record<string, unknown> = {}) => Response.json({ ok: true, ...d });
export const fail = (error: string, status = 400) => Response.json({ ok: false, error }, { status });

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export async function needUser() {
  return getCurrentUser();
}

export const RIDERS = ["Tenzing Sherpa", "Pemba Lepcha", "Suraj Rai", "Bikash Gurung", "Anil Tamang", "Dorjee Bhutia", "Prakash Thapa"];
export const rider = () => {
  const name = RIDERS[Math.floor(Math.random() * RIDERS.length)];
  const phone = "98320" + String(Math.floor(10000 + Math.random() * 89999));
  return { name, phone };
};
