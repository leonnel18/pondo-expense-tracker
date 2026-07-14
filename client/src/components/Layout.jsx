import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getSystemStatus } from '../lib/api';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check system status
        const status = await getSystemStatus();
        setIsFirstLaunch(status.first_launch);
        
        // Show welcome banner for new users
        if (status.first_launch) {
          setShowWelcome(true);
        }

        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    initializeApp();
    // Intentionally run once on mount only — re-running on every route change
    // caused first-launch users to get bounced back to "/" on any navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading Pondo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-negativeLight border border-negative rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-semibold text-negative">Error</h2>
          <p className="mt-2 text-negative">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-negative text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // If first launch, show setup page (handled by App.jsx routes)
  if (isFirstLaunch && location.pathname !== '/') {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <div className="flex-1 flex flex-col">
        <Header onMenuToggle={() => setIsMenuOpen((open) => !open)} />
        <main className="flex-1 p-6">
          {showWelcome && (
            <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="bg-brand-100 rounded-full p-2 mr-3">
                  <svg className="w-5 h-5 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-brand-800">Welcome to Pondo!</h3>
                  <p className="text-brand-700 mt-1">
                    We've created a "Cash" account for you to get started. You can rename it or add more accounts anytime.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => navigate('/entries/add')}
                      className="bg-brand-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-brand-700"
                    >
                      Add Your First Entry
                    </button>
                    <button 
                      onClick={() => navigate('/accounts/add')}
                      className="bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1.5 rounded-md text-sm hover:bg-brand-100"
                    >
                      Create New Account
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setShowWelcome(false)}
                  className="ml-auto text-brand-500 hover:text-brand-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;