/**
 * Root-level 404 handler.
 *
 * Returns HTTP 404 (not 200) automatically when this file is rendered.
 * The route group `(main)/not-found.tsx` overrides this for the public
 * marketing site, but having a root fallback prevents Next from serving
 * the default un-styled 404 if a route segment forgets its own copy.
 */

import Link from "next/link";

export default function RootNotFound() {
    return (
        <div
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
                <p
                    aria-hidden
                    style={{
                        fontSize: 72,
                        fontWeight: 800,
                        margin: 0,
                        color: "#0f172a",
                        letterSpacing: "-0.02em",
                    }}
                >
                    404
                </p>
                <h1 style={{ fontSize: 22, margin: "8px 0 16px" }}>Page not found</h1>
                <p style={{ color: "#475569", margin: "0 0 24px" }}>
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Link
                    href="/"
                    style={{
                        display: "inline-block",
                        background: "#0f172a",
                        color: "#fff",
                        padding: "10px 20px",
                        borderRadius: 999,
                        fontWeight: 600,
                        textDecoration: "none",
                    }}
                >
                    Back to home
                </Link>
            </div>
        </div>
    );
}