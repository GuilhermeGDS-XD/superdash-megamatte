'use client';

import { useState } from 'react';
import Sidebar from "@/components/Sidebar";
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex bg-[#0f172a] min-h-screen">
      <Sidebar mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)} />
      <main className="flex-1 min-h-screen bg-[#f8fafc] md:ml-64 md:rounded-tl-[40px] shadow-2xl overflow-x-hidden border-l border-white/10 relative">
        <div className="md:hidden sticky top-0 z-30 bg-[#f8fafc]/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow"
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>
          <p className="text-sm font-black uppercase tracking-widest text-slate-500">SuperDash</p>
        </div>
        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:p-8 max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
