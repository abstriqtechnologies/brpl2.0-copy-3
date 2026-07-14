/**
 * Centralised, zod-validated environment variables.
 *
 * All `process.env.*` reads in the application MUST go through this module.
 * Anything else is a bug. This is the single source of truth for required vs
 * optional configuration and gives us a clear boot-time failure mode instead
 * of "the webhook endpoint silently 400s".
 *
 * Conventions:
 *   - Required in production only — the app boots in dev without them.
 *   - Optionals return `undefined`; callers must handle the absence.
 *   - Booleans parse `1 | true | yes` → true; anything else → false.
 */

import { z } from "zod";

const booleanish = z.union([z.string(), z.boolean(), z.undefined()]).transform((v) => {
    if (v === undefined || v === false) return false;
    if (v === true) return true;
    const s = String(v).trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "on";
});

const nodeEnvSchema = z.enum(["development", "test", "staging", "production"]).default("development");

const schema = z.object({
    NODE_ENV: nodeEnvSchema,

    // Database
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

    // JWT (required in production; dev falls back to insecure placeholder)
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars (256 bits) for HS256 security"),

    // Razorpay — required in production, optional in dev
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    // The webhook secret is REQUIRED in production. The schema accepts an
    // empty string here; the boot check below enforces presence in prod.
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

    // Cloudflare Turnstile — REQUIRED in production (audit M12). Optional
    // in dev so local boot doesn't require external infra.
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    TURNSTILE_SECRET: z.string().optional(),
    NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),

    // SMS (SMSIndiaHub) — required in production, optional in dev
    SMS_API_KEY: process.env.NODE_ENV === "production"
        ? z.string().min(1, "SMS_API_KEY is required in production")
        : z.string().optional(),
    SMS_SENDER_ID: z.string().default("SMSHUB"),
    SMS_GWID: z.string().default("2"),

    // Email transport — pick one (or none, in which case notifications are logged)
    SMTP_URL: z.string().optional(),
    SENDGRID_API_KEY: z.string().optional(),
    SES_REGION: z.string().optional(),

    // Storage
    MEDIA_STORAGE_PATH: z.string().default("public/uploads"),

    // Feature flags
    ALLOW_DEFAULT_ADMIN: booleanish,
    CMS_LIVE: booleanish,

    // Admin phone allowlist — comma-separated 10-digit Indian mobile numbers.
    // Optional; required in production (enforced by
    // `assertProductionBootReadiness()`). Empty/unset values are treated as
    // an empty allowlist by `getAdminAllowedPhones()`, which means no admin
    // can send an OTP — safe default, no hardcoded fallbacks.
    ADMIN_PHONES: z.string().optional(),

    // AI Chat — OpenAI API key (required in production; optional in dev)
    OPENAI_API_KEY: process.env.NODE_ENV === "production"
        ? z.string().min(1, "OPENAI_API_KEY is required in production")
        : z.string().optional(),

    // Public site URL — used by sitemap, robots, OG image absolute URLs.
    // In dev we default to localhost:3001; production must set this.
    SITE_URL: process.env.NODE_ENV === "production"
        ? z.string().url("SITE_URL must be a valid URL in production")
        : z.string().url("SITE_URL must be a valid URL").optional(),

    // Security knobs (used by Phase 1)
    Brpl_CSRF_REQUIRED: booleanish,
});

export type Env = z.infer<typeof schema>;

/**
 * Parse and validate `process.env` against the schema. Surfaces every problem
 * at once instead of failing on the first missing variable.
 */
function parseEnv(): Env {
    const parsed = schema.safeParse(process.env);
    if (parsed.success) return parsed.data;

    // In development/test, fall back to safe defaults so the dev server still
    // boots. In production, fail loudly with all errors at once.
    const isProd = process.env.NODE_ENV === "production";
    const messages = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");

    if (isProd) {
        throw new Error(`[env] Invalid environment configuration:\n${messages}`);
    }

    // Dev fallback: re-parse with stub values for anything missing.
    const stub: Record<string, string> = { ...(process.env as Record<string, string | undefined>) } as Record<
        string,
        string
    >;
    for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!(key in stub) || stub[key] === "") {
            // Use a clearly fake placeholder so devs know something is missing.
            stub[key] = `dev-placeholder-${key}`;
        }
    }
    const reparsed = schema.safeParse(stub);
    if (!reparsed.success) {
        // Schema-level mismatch (rare) — fall back to a permissive shape.
        // eslint-disable-next-line no-console
        console.warn(`[env] Could not validate env even with dev fallbacks:\n${messages}`);
        return schema.parse({
            NODE_ENV: "development",
            MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/dev",
            JWT_SECRET: "dev-insecure-secret-change-me",
            ...stub,
        });
    }
    return reparsed.data;
}

/**
 * Validated env object. Read this once at module load; subsequent reads are free.
 *
 * NOTE: We use `let` + lazy parse so importing this module during test setup
 * (when env vars may be partially set) doesn't blow up.
 */
let _env: Env | null = null;
export function getEnv(): Env {
    if (_env) return _env;
    _env = parseEnv();
    return _env;
}

/**
 * Eagerly-parsed env for production paths. Throws on import in production if
 * config is bad — better to crash at boot than to serve traffic with the
 * webhook secret missing.
 *
 * Most call sites should use `env` (the exported const) below, which lazily
 * parses and tolerates dev environments.
 */
export const env = new Proxy({} as Env, {
    get(_target, prop: string) {
        const e = getEnv();
        return (e as Record<string, unknown>)[prop];
    },
});

/**
 * Test-only: clear the cached env so `getEnv()` re-parses on next read.
 *
 * Tests that flip NODE_ENV (or any other env var) between cases must call
 * this so the `env` proxy + `isProduction()` / `isDev()` helpers observe
 * the new value. Not exported from the default surface — opt-in via
 * `import { __resetEnvCacheForTests } from "@/lib/env"`.
 */
export function __resetEnvCacheForTests(): void {
    _env = null;
}

export const isProduction = (): boolean => getEnv().NODE_ENV === "production";
export const isStaging = (): boolean => getEnv().NODE_ENV === "staging";
export const isDev = (): boolean => getEnv().NODE_ENV === "development";
export const isTest = (): boolean => getEnv().NODE_ENV === "test";

/**
 * Throw at module load if a critical secret is missing in production.
 * Used by Razorpay, JWT, webhook secrets.
 */
export function assertProductionSecret(name: keyof Env, value: string | undefined): asserts value is string {
    if (!value && isProduction()) {
        throw new Error(`[env] ${String(name)} must be set in production`);
    }
}

/**
 * Verify that all production-required secrets are present.
 * Call this once at app boot (e.g. from `instrumentation.ts`).
 * Throws a single aggregated error listing every missing secret.
 */
export function assertProductionBootReadiness(): void {
    if (!isProduction()) return;
    const missing: string[] = [];
    if (!env.JWT_SECRET || env.JWT_SECRET.startsWith("dev-placeholder-")) {
        missing.push("JWT_SECRET");
    }
    // Reject well-known dev placeholder patterns even if the secret is present.
    // audit fix: catching "dev-insecure-secret" / "change-me" stubs that
    // someone might have shipped to prod by mistake.
    if (env.JWT_SECRET && /(dev-insecure|change-me|placeholder)/i.test(env.JWT_SECRET)) {
        missing.push(
            "JWT_SECRET looks like a dev placeholder — rotate to a real 32+ byte secret (openssl rand -hex 32)",
        );
    }
    if (!env.MONGODB_URI || env.MONGODB_URI.startsWith("dev-placeholder-")) {
        missing.push("MONGODB_URI");
    }
    if (!env.RAZORPAY_KEY_ID) missing.push("RAZORPAY_KEY_ID");
    if (!env.RAZORPAY_KEY_SECRET) missing.push("RAZORPAY_KEY_SECRET");
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
        missing.push("RAZORPAY_WEBHOOK_SECRET (webhooks will 400 without it)");
    }
    // Audit M12: Turnstile gates the unauthenticated contact + chat
    // surfaces. Missing in prod → boot check fails closed.
    if (!env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
        missing.push("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
    }
    if (!env.TURNSTILE_SECRET) {
        missing.push("TURNSTILE_SECRET");
    }
    if (!env.ADMIN_PHONES || env.ADMIN_PHONES.trim() === "") {
        missing.push("ADMIN_PHONES (no admin can receive an OTP without it)");
    }
    if (!env.OPENAI_API_KEY) {
        missing.push("OPENAI_API_KEY (AI chat will 500 without it)");
    }
    if (missing.length > 0) {
        throw new Error(
            `[env] Production boot check failed. Missing required env vars:\n  - ${missing.join("\n  - ")}`,
        );
    }
}
