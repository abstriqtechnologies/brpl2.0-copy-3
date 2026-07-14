import mongoose from "mongoose";
import { env, isTest } from "./env";
import { logger } from "./logger";

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially.
 */
type MongooseGlobal = typeof globalThis & {
    mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

const globalForMongoose = global as MongooseGlobal;
const cached = globalForMongoose.mongoose ?? (globalForMongoose.mongoose = { conn: null, promise: null });

/**
 * Skip the actual MongoDB connection in vitest runs. Test files mock the
 * model layer via `vi.mock("@/models/...")`, so the connection itself is
 * unnecessary — but every route handler calls `connectDB()` defensively,
 * and we don't want flaky infrastructure (no Mongo, sandboxed DNS, etc.)
 * to fail otherwise-healthy tests.
 *
 * The trade-off: tests that exercise the real Mongoose repos
 * (`MongooseUserRepo`, etc.) need a real MongoDB. Those live behind an
 * `integration/` directory and opt-in to live infra.
 */
function shouldSkipConnection(): boolean {
    return isTest();
}

export async function connectDB(): Promise<typeof mongoose> {
    const uri = env.MONGODB_URI;
    if (!uri || uri.startsWith("dev-placeholder-")) {
        throw new Error("Please define MONGODB_URI in .env.local");
    }
    if (shouldSkipConnection()) {
        // Return the module-level `mongoose` import so callers don't have
        // to handle undefined. Tests that mock the model layer never
        // exercise the actual connection — this short-circuits the
        // otherwise-eager `mongoose.connect()` call.
        return mongoose;
    }
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, {
            // Audit H9: pool / timeout tuning. The defaults leave
            // sockets open indefinitely (socketTimeoutMS=0) which can
            // hang reads for minutes on a quiet Atlas failover.
            bufferCommands: false,
            serverSelectionTimeoutMS: 10_000,
            socketTimeoutMS: 30_000,
            connectTimeoutMS: 10_000,
            maxPoolSize: 50,
            minPoolSize: 5,
            maxIdleTimeMS: 60_000,
            retryWrites: true,
            appName: "brpl-web",
        });
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        // Redact the URI before logging — never write credentials to logs.
        const redactedUri = uri.replace(/\/\/([^@]+)@/, "//[redacted]@");
        logger.error(
            "[mongodb] Connection failed — verify MONGODB_URI and Atlas IP allowlist",
            { uri: redactedUri },
            e instanceof Error ? e.message : e,
        );
        throw e;
    }
    return cached.conn;
}
