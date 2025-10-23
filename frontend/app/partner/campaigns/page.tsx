'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CampaignsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the current campaigns page
    router.replace('/partner/campaigns/current');
  }, [router]);

  return null;
}
