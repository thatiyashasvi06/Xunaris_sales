import React, { useState } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import { SpecSidebar } from './components/spec/SpecSidebar';
import { SpecToday } from './components/spec/SpecToday';
import { SpecDashboard } from './components/spec/SpecDashboard';
import { SpecLeads } from './components/spec/SpecLeads';
import { SpecCompaniesContacts } from './components/spec/SpecCompaniesContacts';
import { SpecOpportunities } from './components/spec/SpecOpportunities';
import { SpecActivities } from './components/spec/SpecActivities';
import { SpecCampaigns } from './components/spec/SpecCampaigns';
import { SpecSalesAgent } from './components/spec/SpecSalesAgent';
import { PublicBooking } from './components/spec/PublicBooking';
import { SpecReports } from './components/spec/SpecReports';
import { SpecAdminSettings } from './components/spec/SpecAdminSettings';
import { SpecSwaggerBackend } from './components/spec/SpecSwaggerBackend';
import { SpecLoginModal } from './components/spec/SpecLoginModal';
import { AuthProvider } from './context/AuthContext';
import { XunarisLogo } from './components/common/XunarisLogo';
import { Menu, X } from 'lucide-react';

const MainLayout = () => {
  const { activeNav, setActiveNav, isLoggedIn, currentUser, setIsLoggedIn } = useCRM();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  // On phones the menu covers the screen: close it as soon as a screen is chosen
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeNav]);

  // Enforce rule: Settings Admin only
  React.useEffect(() => {
    if (activeNav === 'admin' && currentUser?.role !== 'ADMIN') {
      setActiveNav('today');
    }
  }, [activeNav, currentUser?.role, setActiveNav]);

  if (!isLoggedIn) {
    return <SpecLoginModal />;
  }

  const renderActiveScreen = () => {
    switch (activeNav) {
      case 'today':
        return <SpecToday />;
      case 'dashboard':
        return <SpecDashboard />;
      case 'leads':
        return <SpecLeads />;
      case 'companies':
        return <SpecCompaniesContacts />;
      case 'opportunities':
        return <SpecOpportunities />;
      case 'activities':
        return <SpecActivities />;
      case 'campaigns':
        return <SpecCampaigns />;
      case 'sales-agent':
        return <SpecSalesAgent />;
      case 'reports':
        return <SpecReports />;
      case 'admin':
        return currentUser?.role === 'ADMIN' ? <SpecAdminSettings /> : <SpecToday />;
      case 'swagger':
        return <SpecSwaggerBackend />;
      default:
        return <SpecToday />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans selection:bg-hyra-700 selection:text-white relative">
      {/* Official Xunaris Animated Ambient Background */}

      {/* Mobile Top Header */}
      <div className="lg:hidden bg-[#0a1120] text-white p-4 flex items-center justify-between border-b border-slate-800 relative z-20">
        <XunarisLogo size="sm" />
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-slate-300 hover:text-white rounded-lg bg-slate-800"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 flex items-stretch min-h-0">
        {/* Left Dark Sidebar (Exact Spec Mockup) */}
        <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:static lg:translate-x-0 lg:self-stretch lg:flex lg:flex-col lg:shrink-0 bg-[#0a1120] border-r border-slate-800/80 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <SpecSidebar />
        </div>

        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-[#0a1120]/70 backdrop-blur-xs z-30 lg:hidden"
          />
        )}

        {/* Main Workspace Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto max-w-full">
          <div className="max-w-[1400px] mx-auto w-full">
          {/* Active Screen Rendered Exactly As Mockup */}
          {renderActiveScreen()}

          {/* Page footer: always visible, including on phones where the sidebar is hidden */}
          <footer className="mt-10 pt-4 border-t border-slate-200 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span>&copy; {new Date().getFullYear()} Xunaris Technology Services &middot; HYRA Connect Staffing</span>
            <span>
              Signed in as <strong className="text-slate-500">{currentUser?.name}</strong>
              {currentUser?.role ? ` (${currentUser.role})` : ''} &middot;{' '}
              <button type="button" onClick={() => setIsLoggedIn(false)} className="font-semibold text-slate-500 hover:text-slate-800 underline">
                Sign out
              </button>
            </span>
          </footer>
          </div>
        </main>
      </div>

    </div>
  );
};

export default function App() {
  // Public booking link from outreach emails: no login needed
  const bookMatch = window.location.pathname.match(/^\/book\/([A-Za-z0-9]+)\/?$/);
  if (bookMatch) return <PublicBooking token={bookMatch[1]} />;

  return (
    <AuthProvider>
      <CRMProvider>
        <MainLayout />
      </CRMProvider>
    </AuthProvider>
  );
}
