'use client';

import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminAuthInit } from '@/components/admin/admin-auth-init';
import { AdminOrderNotifications } from '@/components/admin/order-notifications';
import { useAdminAuth } from '@/lib/admin-auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const brandId = useAdminAuth((s) => s.brandId);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-4 lg:p-6">
          <AdminAuthInit />
          <AdminOrderNotifications brandId={brandId} />
          {children}
        </main>
      </div>
    </div>
  );
}