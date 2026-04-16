'use client';

import dynamic from 'next/dynamic';

const SecurityDashboard = dynamic(() => import('@/app/admin/security-dashboard/page'), {
  ssr: false,
});

export function SecurityDashboardWrapper() {
  return <SecurityDashboard />;
}
