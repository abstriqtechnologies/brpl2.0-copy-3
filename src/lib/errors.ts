/**
 * Re-export of the typed AppError hierarchy so callers can `import { ... } from "@/lib/errors"`.
 *
 * The actual implementation lives in `@/lib/api/errors` to keep the
 * `server-only` dependency surface small. This file exists purely as
 * a stable, ergonomic import path that mirrors common conventions.
 */

export {
    AppError,
    BadRequestError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    UpstreamError,
    isAppError,
    type AppErrorCode,
} from "@/lib/api/errors";