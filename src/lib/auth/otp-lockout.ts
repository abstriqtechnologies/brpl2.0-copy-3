import "server-only";

export const OTP_LOCKOUT_LIMIT = 5;
export const OTP_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

type Attempt = { count: number; firstAt: number; lockedUntil: number | null };

export class OtpLockout {
    private attempts = new Map<string, Attempt>();
    private now: () => number;
    constructor(now: () => number = () => Date.now()) {
        this.now = now;
    }

    recordFailure(phone: string): boolean {
        const now = this.now();
        const cur = this.attempts.get(phone);
        if (!cur || now - cur.firstAt > OTP_LOCKOUT_WINDOW_MS) {
            this.attempts.set(phone, { count: 1, firstAt: now, lockedUntil: null });
            return false;
        }
        cur.count += 1;
        if (cur.count >= OTP_LOCKOUT_LIMIT) {
            cur.lockedUntil = now + OTP_LOCKOUT_WINDOW_MS;
            return true;
        }
        return false;
    }

    recordSuccess(phone: string): void {
        this.attempts.delete(phone);
    }

    isLocked(phone: string): boolean {
        const cur = this.attempts.get(phone);
        if (!cur || !cur.lockedUntil) return false;
        if (this.now() >= cur.lockedUntil) {
            this.attempts.delete(phone);
            return false;
        }
        return true;
    }
}

let _singleton: OtpLockout | null = null;
export function getOtpLockout(): OtpLockout {
    if (!_singleton) _singleton = new OtpLockout();
    return _singleton;
}
