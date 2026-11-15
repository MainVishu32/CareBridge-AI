import React from 'react';
import { 
  LayoutDashboard, 
  Pill, 
  CalendarDays, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { NavigationTab, UserRole } from '../../types';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  pendingMedsCount: number;
  upcomingAptsCount: number;
  role: UserRole;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingMedsCount,
  upcomingAptsCount,
  role,
  isOpenMobile,
  onCloseMobile,
  onSignOut,
}) => {
  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string; roleHint?: string }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'medications',
      label: 'Medications',
      icon: <Pill className="w-5 h-5" />,
      badge: pendingMedsCount > 0 ? pendingMedsCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: <CalendarDays className="w-5 h-5" />,
      badge: upcomingAptsCount > 0 ? upcomingAptsCount : undefined,
      badgeColor: 'bg-brand-100 text-brand-800',
    },
    {
      id: 'care-circle',
      label: 'Care Circle',
      icon: <Users className="w-5 h-5" />,
      roleHint: role === 'elderly' ? 'Manage' : 'View',
    },
    {
      id: 'reports',
      label: 'Reports & Vitals',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const handleNavClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const roleDescription = role === 'elderly'
    ? { title: 'Profile Owner', desc: 'Full profile control, member invites & revocations', icon: <ShieldCheck className="w-4 h-4 text-purple-600" /> }
    : role === 'caretaker'
    ? { title: 'Caretaker', desc: 'Permitted health activities & routine tracking', icon: <UserCheck className="w-4 h-4 text-brand-600" /> }
    : { title: 'Family Member', desc: 'Read-only health visibility & emergency coordination', icon: <ShieldCheck className="w-4 h-4 text-sage-600" /> };

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4">
      {/* Navigation list */}
      <div className="space-y-1.5">
        
        {/* Role Permissions Callout */}
        <div className="mb-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            {roleDescription.icon}
            <span>{roleDescription.title}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            {roleDescription.desc}
          </p>
        </div>

        <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          Healthcare Navigation
        </div>

        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-base transition-all select-none touch-target ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span className={isActive ? 'text-white' : 'text-slate-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-2">
                {item.roleHint && !isActive && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {item.roleHint}
                  </span>
                )}
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    isActive ? 'text-white' : 'text-slate-400 opacity-60'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Section: Active Caregiver / Adherence status & Sign out */}
      <div className="pt-6 border-t border-slate-200 space-y-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1">
            <ShieldCheck className="w-4 h-4 text-sage-600" />
            <span>Healthcare Session</span>
          </div>
          <p className="text-sm font-bold text-slate-800">Role Verified & Active</p>
          <p className="text-xs text-slate-500">RLS Database Policies Enforced</p>
        </div>

        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit / Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-72 bg-white border-r border-slate-200 shrink-0">
        <div className="sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
          {navContent}
        </div>
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
