import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGate } from './components/AuthGate';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Entries from './pages/Entries';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import Recurrences from './pages/Recurrences';
import Export from './pages/Export';
import AddEntry from './pages/AddEntry';
import EditEntry from './pages/EditEntry';
import AddAccount from './pages/AddAccount';
import EditAccount from './pages/EditAccount';
import AddTransfer from './pages/AddTransfer';
import EditTransfer from './pages/EditTransfer';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ResetPassword from './pages/ResetPassword';
import RecycleBin from './pages/RecycleBin';
import TagsReport from './pages/TagsReport';

const NotFound = () => (
  <div className="p-12 text-center">
    <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
    <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
    <Link to="/" className="text-brand-600 hover:text-brand-700 font-medium">
      Back to Dashboard
    </Link>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes — no auth required */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected routes — wrapped in AuthGate */}
          <Route path="/" element={
            <AuthGate><Layout /></AuthGate>
          }>
            <Route index element={<Dashboard />} />
            <Route path="entries" element={<Entries />} />
            <Route path="entries/add" element={<AddEntry />} />
            <Route path="entries/:id/edit" element={<EditEntry />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="accounts/add" element={<AddAccount />} />
            <Route path="accounts/:id/edit" element={<EditAccount />} />
            <Route path="categories" element={<Categories />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="recurrences" element={<Recurrences />} />
            <Route path="export" element={<Export />} />
            <Route path="recycle-bin" element={<RecycleBin />} />
            <Route path="reports/tags" element={<TagsReport />} />
            <Route path="transfers/new" element={<AddTransfer />} />
            <Route path="transfers/:transferGroupId/edit" element={<EditTransfer />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;