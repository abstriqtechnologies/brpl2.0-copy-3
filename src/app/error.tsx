"use client";

/**
 * Root-level error boundary for the App Router.
 *
 * Catches errors thrown in any route segment that does NOT define its own
 * `error.tsx`. The Next.js digest is the request ID — surface it so users
 * can quote it in support tickets.
 *
 * Must be a Client Component (Next.js requirement).
 */

import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Server-side logging happens in the route's withRequest catch block.
        // For client-side throws, log here so the browser console shows it.
        // eslint-disable-next-line no-console
        console.error("[app/error]", error);
    }, [error]);

    return (
        <div
            role="alert"
            style={{
                minHeight: "60vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
                fontFamily: "system-ui, -apple-system, sans-serif",
            }}
        >
            <div style={{ maxWidth: 480, textAlign: "center" }}>
                <div
                    aria-hidden
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "#fef3c7",
                        color: "#92400e",
                        fontSize: 28,
                        marginBottom: 16,
                    }}
                >
                    !
                </div>
                <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something went wrong</h1>
                <p style={{ color: "#475569", margin: "0 0 16px" }}>
                    An unexpected error occurred while loading this page.
                </p>
                {error.digest ? (
                    <p
                        style={{
                            fontSize: 12,
                            color: "#94a3b8",
                            marginBottom: 24,
                            fontFamily: "monospace",
                        }}
                    >
                        Reference: {error.digest}
                    </p>
                ) : null}
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                    <button
                        type="button"
                        onClick={reset}
                        style={{
                            background: "#f59e0b",
                            color: "#000",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: 999,
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        style={{
                            background: "transparent",
                            color: "#0f172a",
                            border: "1px solid #cbd5e1",
                            padding: "10px 20px",
                            borderRadius: 999,
                            fontWeight: 600,
                            textDecoration: "none",
                        }}
                    >
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    );
}