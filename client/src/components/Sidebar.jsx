import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { navItems } from '../lib/navigation';

const Sidebar = ({ isOpen = false, onClose }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };


  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={`w-64 bg-brand-800 text-brand-200 flex flex-col fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      <div className="p-6">
        <div className="flex items-center">
          <div className="bg-brand-600 rounded-lg p-2">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-bold text-white">Pondo</h1>
            <p className="text-xs text-brand-400">YOUR MONEY, IN FOCUS</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-brand-700 text-white'
                      : 'text-brand-200 hover:bg-brand-700 hover:text-white'
                  }`}
                >
                  <IconComponent className="w-5 h-5 mr-3" strokeWidth={2} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

        <div className="p-4 border-t border-brand-700 text-xs text-brand-400">
          <p>Household Expense Tracker</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;