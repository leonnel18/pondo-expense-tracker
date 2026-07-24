import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getSettings } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import BalanceHero from '../components/dashboard/BalanceHero';
import QuickAdd from '../components/dashboard/QuickAdd';
import AccountSummary from '../components/dashboard/AccountSummary';
import BudgetCard from '../components/dashboard/BudgetCard';
import RecurrenceConfirmCard from '../components/dashboard/RecurrenceConfirmCard';
import RecentEntries from '../components/dashboard/RecentEntries';
import FilterPanel from '../components/dashboard/FilterPanel';
import TimeFilter from '../components/dashboard/TimeFilter';
import { computePresetRange, normalizePeriodStartDay } from '../lib/periodPresets';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // refetch when auth state changes (logout→login)
  const [dashboardData, setDashboardData] = useState({
    kpi: {
      total_income: 0,
      total_expenses: 0,
      net_balance: 0,
      total_balance: 0
    },
    accounts: [],
    recentEntries: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodStartDay, setPeriodStartDay] = useState(1);
  const [preset, setPreset] = useState('this_month');
  const [filters, setFilters] = useState({
    from: '',
    to: ''
  });

  // US-41: load the custom period-start-day setting once, then apply it to
  // the initial "This Month" range — replaces the dashboard route's own
  // calendar-month default (server/routes/dashboard.js's getDefaultDateRange),
  // which has no notion of a custom start day.
  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((settings) => {
        if (cancelled) return;
        const day = normalizePeriodStartDay(settings.period_start_day);
        setPeriodStartDay(day);
        setFilters(computePresetRange('this_month', day));
      })
      .catch(() => {
        if (cancelled) return;
        setFilters(computePresetRange('this_month', 1));
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    setFilters(computePresetRange(newPreset, periodStartDay));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filters, user]); // refetch on filter change AND on auth state change

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getDashboard(filters.from, filters.to);
      setDashboardData(data);
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleEntryAdded = () => {
    // Refresh dashboard data after adding an entry
    fetchDashboardData();
  };

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Track your financial health at a glance</p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <TimeFilter value={preset} onChange={handlePresetChange} />
      </div>

      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        accounts={[]}
        categories={{}}
        showTypeFilter={false}
        showDateFilters={true}
        showSearch={false}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <BalanceHero kpi={dashboardData.kpi} />
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Entries</h2>
              <button
                onClick={() => navigate('/entries')}
                className="text-sm text-brand-600 hover:text-brand-700 transition-colors duration-150"
              >
                View all
              </button>
            </div>
            <RecentEntries
              entries={dashboardData.recentEntries}
              onEdit={(entry) => navigate(`/entries/${entry.id}/edit`)}
              onDelete={() => fetchDashboardData()} // Refresh after delete
            />
          </div>
        </div>

        <div className="space-y-6">
          <QuickAdd onEntryAdded={handleEntryAdded} />
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Accounts</h2>
              <button
                onClick={() => navigate('/accounts')}
                className="text-sm text-brand-600 hover:text-brand-700 transition-colors duration-150"
              >
                View all
              </button>
            </div>
            <AccountSummary accounts={dashboardData.accounts} />
          </div>

          <RecurrenceConfirmCard />

          <BudgetCard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;