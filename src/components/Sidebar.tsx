// src/components/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  PlusCircle, 
  Users, 
  History, 
  LogOut,
  BarChart3,
  Target,
  Database,
  LayoutList,
  X,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { isAdmin, isSuperAdmin, roleLabel } from '@/lib/roles';

interface SidebarProps {
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
}

const Sidebar = ({ mobileMenuOpen, onCloseMobileMenu }: SidebarProps) => {
  const pathname = usePathname();
  const { user, loading } = useUser();

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE', credentials: 'include' });
    window.location.href = '/login';
  };

  // Itens básicos (acessíveis por todos)
  const navItems = [
    { name: 'Campanhas', href: '/', icon: Target },
  ];

  // Adiciona itens extras apenas para usuários logados
  if (user) {
    navItems.push({ name: 'Nova Campanha', href: '/admin/create-campaign', icon: PlusCircle });

    // Itens administrativos
    if (isAdmin(user.role)) {
      navItems.push(
        { name: 'Usuários', href: '/admin/users', icon: Users },
        { name: 'Logs', href: '/admin/logs', icon: History }
      );
    }

    // Itens exclusivos Super Admin
    if (isSuperAdmin(user.role)) {
      navItems.push(
        { name: 'Importar CSV', href: '/admin/import', icon: Database },
        { name: 'Contas de Anúncios', href: '/admin/ad-accounts', icon: LayoutList }
      );
    }
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden transition-opacity",
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onCloseMobileMenu}
      />

      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-72 md:w-64 bg-slate-900 text-white transition-transform duration-300",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
      <div className="flex h-full flex-col px-3 py-4 overflow-y-auto">
        <div className="flex items-center justify-between ps-2.5 mb-8">
          <div className="flex items-center">
          <BarChart3 className="h-8 w-8 text-orange-500 mr-3" />
          <span className="self-center text-xl font-bold whitespace-nowrap">MegaMatte</span>
          </div>
          <button
            onClick={onCloseMobileMenu}
            className="md:hidden h-9 w-9 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="space-y-2 font-medium flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onCloseMobileMenu}
                  className={cn(
                    "flex items-center p-3 rounded-lg group transition-all duration-200",
                    isActive 
                      ? "bg-blue-600/20 text-blue-400 border-l-4 border-blue-500" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-white")} />
                  <span className="ms-3">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-slate-800 pt-4 mt-4">
          {user ? (
            <>
              <div className="px-3 mb-4">
                <div className="group block">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] transition-colors">
                    Usuário logado
                  </p>
                  <p className="text-sm font-medium mt-1 truncate text-slate-200">{user?.name || 'Carregando...'}</p>
                  <p className="text-[10px] text-blue-500 font-black uppercase mt-0.5 tracking-widest">{roleLabel(user?.role) || 'Aguarde'}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex w-full items-center p-3 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-all duration-200"
              >
                <LogOut className="h-5 w-5" />
                <span className="ms-4 font-medium text-sm">Sair da conta</span>
              </button>
            </>
          ) : (
            <div className="px-3">
              <Link
                href="/login"
                onClick={onCloseMobileMenu}
                className="flex w-full items-center justify-center p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                Entrar no Sistema
              </Link>
            </div>
          )}
        </div>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
