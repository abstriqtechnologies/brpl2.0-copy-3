import { defineConfig } from "vitest/config";
import path from "node:path";
import dotenv from "dotenv";
import react from "@vitejs/plugin-react";

dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
    plugins: [react()],
    esbuild: {
        jsx: "automatic",
        jsxImportSource: "react",
    },
    test: {
        environment: "node",
        globals: false,
        include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
        setupFiles: ["tests/setup.ts"],
        // `forks` pool gives each test file its own Node process so
        // module-level singletons (env cache, settings memo, rate limiter)
        // can't leak between files. Without this, tests that flip
        // NODE_ENV / process.env in `beforeEach` race against each other
        // when run in the same process.
        pool: "forks",
        // Stub Next.js's build-time guards so service code can be loaded
        // under vitest. server-only is a no-op at test time.
        server: {
            deps: {
                inline: [/server-only/],
            },
        },
        alias: [
            { find: "server-only", replacement: path.resolve(import.meta.dirname, "tests/server-only-stub.ts") },
            { find: /^next\/cache$/, replacement: path.resolve(import.meta.dirname, "tests/next-cache-stub.ts") },
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            include: ["src/lib/**/*.{ts,tsx}", "src/app/api/**/*.{ts,tsx}"],
            exclude: [
                "src/lib/**/*.{types,mock}.ts",
                "src/lib/**/__tests__/**",
                "src/lib/**/__mocks__/**",
                "src/lib/logger.ts",
                "src/lib/mongodb.ts",
                "src/lib/email.ts",
                "src/lib/sms.ts",
                "src/lib/totp.ts",
            ],
            thresholds: {
                // Audit M3: tighter than the previous all-zeros. Still
                // permissive enough to not block day-to-day work, but
                // high enough that a wholly-untested module shows up.
                // Bump as critical-path coverage lands.
                lines: 40,
                functions: 40,
                branches: 30,
                statements: 40,
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "src"),
        },
    },
});