'use client';

import { useRouter } from 'next/navigation';
import { useDemoContext } from '@/context/demo-context';
import { useEffect } from 'react';

export default function DemoLanding() {
  const router = useRouter();
  const { userRole } = useDemoContext();

  useEffect(() => {
    // Redirect to appropriate dashboard based on role
    if (userRole === 'partner') {
      router.push('/demo/partner/dashboard');
    } else {
      router.push('/demo/vendor/dashboard');
    }
  }, [userRole, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading demo...</p>
      </div>
    </div>
  );
}
