import React from 'react';
import { Activity, User, FileText, Pill, Stethoscope, LayoutDashboard, Upload } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'inventory', label: 'Medical Inventory', icon: FileText },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'symptoms', label: 'Symptom Log', icon: Activity },
  { id: 'upload', label: 'Upload Reports', icon: Upload },
  { id: 'doctor', label: 'Find Doctor', icon: Stethoscope },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isMobileOpen, setIsMobileOpen }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:inset-auto md:flex md:flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-center h-16 border-b border-gray-100 bg-brand-50">
          <div className="flex items-center gap-2 text-brand-700">
            <Activity className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight">MediQuest AI</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setIsMobileOpen(false);
                }}
                className={`
                  flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-brand-50 text-brand-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
              JD
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">John Doe</p>
              <p className="text-xs text-gray-500">Patient ID: #8834</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};