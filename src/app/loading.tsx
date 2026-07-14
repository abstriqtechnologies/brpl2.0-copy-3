/**
 * Root-level loading UI for the App Router.
 *
 * Shown by Next.js while the initial route segment is being prepared on
 * the server. Individual segments can override this by adding their own
 * `loading.tsx`. The skeleton keeps CLS low by reserving space for the
 * upcoming content.
 */

export default function RootLoading() {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Loading page"
            style={{
                minHeight: "60vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
            }}
        >
            <div
                style={{
                    width: 40,
                    height: 40,
                    border: "3px solid #e2e8f0",
                    borderTopColor: "#0f172a",
                    borderRadius: "50%",
                    animation: "brpl-spin 0.9s linear infinite",
                }}
            />
            <style>{`@keyframes brpl-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}