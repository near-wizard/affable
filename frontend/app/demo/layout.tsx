'use client';

import { DemoProvider, useDemoContext } from '@/context/demo-context';
import { usePathname, useRouter } from 'next/navigation';

function DemoLayoutContent({ children }: { children: React.ReactNode }) {
  const { userRole, setUserRole } = useDemoContext();
  const router = useRouter();
  const pathname = usePathname();

  const handleRoleToggle = () => {
    const newRole = userRole === 'partner' ? 'vendor' : 'partner';
    setUserRole(newRole);

    // Navigate to corresponding dashboard
    if (pathname.includes('/demo/partner/')) {
      router.push(`/demo/vendor/dashboard`);
    } else if (pathname.includes('/demo/vendor/')) {
      router.push(`/demo/partner/dashboard`);
    }
  };

  return (
    <div>
      {/* Demo Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Affable Demo</h1>
              <p className="text-blue-100 text-sm mt-1">
                Interactive walkthrough - No data is saved
              </p>
            </div>
            <button
              onClick={handleRoleToggle}
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition"
            >
              Switch to {userRole === 'partner' ? 'Vendor' : 'Partner'} View
            </button>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <DemoLayoutContent>{children}</DemoLayoutContent>
    </DemoProvider>
  );
}
