/**
 * Minimal type declarations for `bcryptjs` — needed because the project
 * doesn't ship `@types/bcryptjs` and the upstream DefinitelyTyped types
 * have been stale for years. We only need `hash`, `compare`, and the
 * `hashSync` / `compareSync` variants used by `src/lib/auth/*`.
 */
declare module "bcryptjs" {
    export function hash(
        data: string,
        saltOrRounds: string | number,
        callback?: (err: Error | null, hash: string) => void,
    ): Promise<string>;
    export function hashSync(data: string, saltOrRounds?: string | number): string;
    export function compare(
        data: string,
        encrypted: string,
        callback?: (err: Error | null, result: boolean) => void,
    ): Promise<boolean>;
    export function compareSync(data: string, encrypted: string): boolean;
    export function genSaltSync(rounds?: number): string;
    export function genSalt(rounds?: number): Promise<string>;
    const _default: {
        hash: typeof hash;
        hashSync: typeof hashSync;
        compare: typeof compare;
        compareSync: typeof compareSync;
        genSalt: typeof genSalt;
        genSaltSync: typeof genSaltSync;
    };
    export default _default;
}