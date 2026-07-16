import { LayoutDashboard, ClipboardList, Trash2, Wallet, Tags, Download, PiggyBank, Repeat, Hash } from 'lucide-react';

export const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/entries', label: 'All Entries', icon: ClipboardList },
    { path: '/recycle-bin', label: 'Recycle Bin', icon: Trash2 },
    { path: '/accounts', label: 'Accounts', icon: Wallet },
    { path: '/categories', label: 'Categories', icon: Tags },
    { path: '/reports/tags', label: 'Tags Report', icon: Hash },
    { path: '/budgets', label: 'Budgets', icon: PiggyBank },
    { path: '/recurrences', label: 'Recurring', icon: Repeat },
    { path: '/export', label: 'Export', icon: Download },
];

// Bottom nav shows a subset — max 5 items for mobile thumb reach
export const bottomNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/entries', label: 'Entries', icon: ClipboardList },
    { path: '/recycle-bin', label: 'Bin', icon: Trash2 },
    { path: '/accounts', label: 'Accounts', icon: Wallet },
    { path: '/export', label: 'Export', icon: Download },
];