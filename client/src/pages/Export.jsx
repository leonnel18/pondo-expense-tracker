import React, { useState } from 'react';
import { exportEntries, exportAccounts } from '../lib/api';
import Button from '../components/ui/Button';

const Export = () => {
  const [exporting, setExporting] = useState({
    entries: false,
    accounts: false
  });
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  // Handle export entries
  const handleExportEntries = async () => {
    try {
      setExporting(prev => ({ ...prev, entries: true }));
      setError(null);
      
      const params = {};
      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to) params.to = dateRange.to;
      
      await exportEntries(params);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(prev => ({ ...prev, entries: false }));
    }
  };

  // Handle export accounts
  const handleExportAccounts = async () => {
    try {
      setExporting(prev => ({ ...prev, accounts: true }));
      setError(null);
      
      await exportAccounts();
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(prev => ({ ...prev, accounts: false }));
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Data Export</h2>

      {error && (
        <div className="bg-negativeLight border border-negative rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-negative mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-negative font-medium">{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Entries */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Export Entries</h3>
          <p className="text-neutral-600 mb-4">
            Download all your income and expense entries as a CSV file.
          </p>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-neutral-700 mb-2">Columns:</h4>
            <p className="text-sm text-neutral-600">
              ID, Type, Amount, Date, Category, Account, Note, Created-at, Updated-at
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="block w-full px-3 py-2 border border-neutral-200 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="block w-full px-3 py-2 border border-neutral-200 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
          
          <Button
            onClick={handleExportEntries}
            loading={exporting.entries}
            disabled={exporting.entries}
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Entries CSV
          </Button>
        </div>

        {/* Export Accounts */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Export Accounts</h3>
          <p className="text-neutral-600 mb-4">
            Download all your accounts as a CSV file.
          </p>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-neutral-700 mb-2">Columns:</h4>
            <p className="text-sm text-neutral-600">
              ID, Name, Type, Description
            </p>
          </div>
          
          <Button
            onClick={handleExportAccounts}
            loading={exporting.accounts}
            disabled={exporting.accounts}
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Accounts CSV
          </Button>
        </div>
      </div>

      {/* Export Preview */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Export Preview (first 5 rows)</h3>
        
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Account
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-neutral-500">
                  Preview data will be available after you export your data
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Export;