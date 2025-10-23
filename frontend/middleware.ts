import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to protect authenticated routes
 * Checks for valid auth tokens and redirects to login if not present
 */

// Routes that require authentication
const protectedRoutes = [
  '/partner',
  '/vendor',
];

// Routes that should redirect to dashboard if user is already logged in
const authRoutes = [
  '/login',
  '/signup',
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const authToken = request.cookies.get('auth_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;

  // Check if the route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // Check if it's an auth page
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect to login if accessing protected route without auth token
  if (isProtectedRoute && !authToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify user role matches the route they're accessing
  if (isProtectedRoute && authToken && userRole) {
    if (pathname.startsWith('/partner') && userRole !== 'partner') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (pathname.startsWith('/vendor') && userRole !== 'vendor_user') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect to appropriate dashboard if user is logged in and trying to access auth pages
  if (isAuthRoute && authToken && userRole) {
    if (userRole === 'partner') {
      return NextResponse.redirect(new URL('/partner/dashboard', request.url));
    }
    if (userRole === 'vendor_user') {
      return NextResponse.redirect(new URL('/vendor/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
