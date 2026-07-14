import { ImageResponse } from "next/og";

/**
 * Dynamic favicon — generated at request time.
 *
 * Renders a small rounded square with the brand initials so we don't
 * ship a static favicon.ico binary. Falls back gracefully if ImageResponse
 * isn't supported in the build target.
 */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#0f172a",
                    color: "#f59e0b",
                    fontSize: 18,
                    fontWeight: 800,
                    borderRadius: 6,
                }}
            >
                B
            </div>
        ),
        size,
    );
}