import React from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PrivacyToggle from './ui/PrivacyToggle';

const Header = ({ onMenuToggle }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/entries': return 'All Entries';
      case '/accounts': return 'Accounts';
      case '/categories': return 'Categories';
      case '/export': return 'Export';
      case '/recycle-bin': return 'Recycle Bin';
      default: return 'Pondo';
    }
  };
  
  const showAddEntryButton = ['/entries'].includes(location.pathname) || location.pathname === '/';
  
  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            className="md:hidden mr-4 text-neutral-500 hover:text-neutral-700"
            onClick={onMenuToggle}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-neutral-800">{getPageTitle()}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <PrivacyToggle />
          {showAddEntryButton && (
            <Link
              to="/entries"
              className="bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Entry
            </Link>
          )}
          
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-600">{user.email}</span>
              <button 
                onClick={signOut}
                className="text-sm text-neutral-500 hover:text-neutral-700"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;