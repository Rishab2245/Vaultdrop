/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Emits a self-contained server bundle, which is what the Dockerfile copies.
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            // Nothing on this site loads a third-party script, font or frame,
            // so the policy can say exactly that. 'unsafe-inline' on styles is
            // Next's inlined critical CSS; scripts get no such exemption, and
            // 'unsafe-eval' is absent, so an injected string cannot become code.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "base-uri 'none'",
              "object-src 'none'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
