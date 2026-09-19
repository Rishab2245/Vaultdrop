import { NextResponse, type NextRequest } from 'next/server';

/**
 * Per-request nonce for the Content-Security-Policy.
 *
 * A flat `script-src 'self'` looks strict and breaks the site: Next's App
 * Router emits inline scripts to stream and hydrate the page, and blocking them
 * renders every route blank. I shipped exactly that, because a curl check
 * confirmed the header was present without confirming the page still worked -
 * curl does not execute scripts.
 *
 * The fix is a nonce rather than 'unsafe-inline'. Next reads the nonce out of
 * the request's CSP header and stamps it onto its own inline scripts, so ours
 * run and an injected one still cannot. 'strict-dynamic' lets those trusted
 * scripts load the chunks they need without listing every filename.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Next inlines critical CSS, and style nonces are not applied to it.
    // Inline styles cannot execute, so the exposure is cosmetic rather than code.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and the favicon. Those are served
     * straight from the CDN and gain nothing from a per-request nonce, while
     * running middleware on them would cost an invocation each.
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
