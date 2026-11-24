import React from 'react';
import { Briefcase, Building2, FileText, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type PortalTab = 'opportunities' | 'applications' | 'company' | 'admin';

interface AppShellProps {
  activeTab: PortalTab;
  onSelectTab: (tab: PortalTab) => void;
  children: React.ReactNode;
}

export function AppShell({ activeTab, onSelectTab, children }: AppShellProps) {
  const { user, isAdmin, signOut } = useAuth();

  const navItems: { id: PortalTab; label: string; Icon: typeof Briefcase; visible: boolean }[] = [
    { id: 'opportunities', label: 'Vacancies', Icon: Briefcase, visible: true },
    {
      id: 'applications',
      label: 'My Applications',
      Icon: FileText,
      visible: user?.role === 'student',
    },
    {
      id: 'company',
      label: 'Company Portal',
      Icon: Building2,
      visible: user?.role === 'company',
    },
    { id: 'admin', label: 'Admin', Icon: ShieldCheck, visible: isAdmin },
  ];

  return (
    <div className="min-h-screen bg-[#f2f7fd] flex flex-col">
      <header className="bg-[#0f294a] border-b border-[#193d6b] text-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-6">
          <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            Capstone 1 Attachment Finder
          </span>

          <nav className="flex items-center gap-2 overflow-x-auto" aria-label="Primary navigation">
            {navItems
              .filter((item) => item.visible)
              .map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectTab(id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === id
                      ? 'bg-sky-100 text-[#0f294a] shadow-xs'
                      : 'text-sky-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-sky-200 whitespace-nowrap">
              {user?.displayName}
              {user?.studentPin ? ` · ${user.studentPin}` : ` · ${user?.role}`}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="px-4 py-2 text-xs font-medium text-white bg-white/10 border border-sky-300/30 rounded-lg hover:bg-white/20 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
