'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BugReportButton } from './bug-report-button';
import { initializeBugReportMonitoring } from '@/lib/bug-report-utils';

/**
 * Bug Report Provider
 * Wraps the application to provide bug reporting functionality on all pages.
 * Only shows the bug report button when user is logged in.
 */
export function BugReportProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState({
    consoleLogs: [],
    networkRequests: [],
  });
  const pathname = usePathname();

  useEffect(() => {
    // Initialize monitoring
    const { consoleLogs, networkRequests } = initializeBugReportMonitoring();
    setDiagnosticData({ consoleLogs, networkRequests });

    // Check if user is logged in by looking for auth token in localStorage
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    setIsLoggedIn(!!token);

    // Listen for auth changes (optional: implement auth state management hook if available)
    const handleStorageChange = () => {
      const newToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      setIsLoggedIn(!!newToken);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Don't show bug report button on auth pages
  const shouldHideBugButton =
    pathname?.includes('/auth') ||
    pathname?.includes('/login') ||
    pathname?.includes('/signup') ||
    pathname?.includes('/register');

  return (
    <>
      {children}
      {isLoggedIn && !shouldHideBugButton && (
        <BugReportButton diagnosticData={diagnosticData} />
      )}
    </>
  );
}
