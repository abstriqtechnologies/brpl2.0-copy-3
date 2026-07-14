/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint runs during `next build` produce hundreds of noisy warnings
  // (no-explicit-any on typed shims, no-img-element on legacy icons, etc.).
  // The dedicated `npm run lint` + CI step is the source of truth for lint
  // enforcement — skipping during build keeps the production build output
  // warning-free without bypassing actual rules.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Modern image formats served automatically by next/image
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: "https", hostname: "*.s3.ap-south-1.amazonaws.com" },
      { protocol: "https", hostname: "brpl-public-uploads.s3.ap-south-1.amazonaws.com" },
      { protocol: "https", hostname: "*.cloudfront.net" },
    ],
  },

  // Security headers + cache-control.
  //
  // The canonical source of truth lives in `src/lib/security-headers.ts`
  // (which is unit-tested). The config below mirrors it — keep the two in
  // sync when adding/removing headers.
  async headers() {
    const isProd = process.env.NODE_ENV === "production";

    const securityHeaders = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-site" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          // Razorpay scripts: checkout.js itself + the risk-detection bundle
          // it loads from cdn.razorpay.com. Keep these in sync with the
          // canonical source in src/lib/security-headers.ts.
          // 'unsafe-eval' is dev-only — Next.js's React Refresh runtime uses
          // eval() to enable HMR; without it `next dev` throws EvalError.
          // Production builds don't ship the runtime, so prod stays strict.
          `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com${isProd ? "" : " 'unsafe-eval'"}`,
          "style-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "frame-src https://checkout.razorpay.com https://api.razorpay.com",
          // Razorpay APIs (incl. analytics/telemetry endpoints).
          "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com https://lumberjack-cx.razorpay.com https://lumberjack-metrics.razorpay.com",
          "media-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'self'",
        ].join("; "),
      },
      ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/:path*.(png|jpg|jpeg|webp|avif|svg|ico|gif)",
        locale: false,
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/uploads/:path*",
        locale: false,
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/_next/static/:path*",
        locale: false,
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/fonts/:path*",
        locale: false,
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

  // Production source maps off (smaller bundles)
  productionBrowserSourceMaps: false,

  // Compress responses
  compress: true,

  // Use SWC minification (default in Next 14, but explicit)
  swcMinify: true,

  // Tree-shake lucide-react etc.
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{member}}",
      preventFullImport: true,
    },
  },

  // Strip inline `//# sourceMappingURL=data:...` source maps from the edge
  // (middleware) bundle. Next 14.2.35 emits them with `eval-source-map` in
  // production, and the production edge sandbox runs modules via `vm.Script`
  // with `codeGeneration.strings` disabled (see `server/web/sandbox/context.js`).
  // The `eval()` of the bundled source map triggers
  // `EvalError: Code generation from strings disallowed for this context`,
  // which makes every request through middleware return HTTP 500.
  // Forcing `devtool: false` for the edge compilation removes the inline
  // source map and lets the bundle run in the strict prod sandbox.
  //
  // Also filter three categories of warnings that the project can't act on:
  //   1. jose's JWE code path uses CompressionStream/DecompressionStream.
  //      We only call SignJWT/jwtVerify (JWS), so the JWE branch is dead
  //      at runtime — webpack just can't prove it statically.
  //   2. The pack-file cache emits a perf note when a string literal
  //      exceeds 128 KiB (a generated source-map chunk in our case).
  //   3. The `next/og` convention file (`opengraph-image.tsx`) MUST run on
  //      the edge runtime, which disables static generation for that one
  //      page. Next.js warns about this; the route still serves fine.
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer && nextRuntime === "edge") {
      config.devtool = false;
    }
    config.ignoreWarnings = [
      ...(Array.isArray(config.ignoreWarnings) ? config.ignoreWarnings : []),
      { module: /node_modules[\\/]jose[\\/]/, message: /(CompressionStream|DecompressionStream)/ },
      { message: /Serializing big strings/ },
      { message: /Using edge runtime.*disables static generation/ },
    ];
    return config;
  },
};

export default nextConfig;
