import { LayoutDashboard, ClipboardList, Trash2, Wallet, Tags, Download, PiggyBank, Repeat, Hash, Settings } from 'lucide-react';

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
    { path: '/settings', label: 'Settings', icon: Settings },
];

// Bottom nav shows a subset for mobile thumb reach. US-41/43/40 (v1.5) added
// a Settings entry per explicit instruction to add it to both Sidebar and
// BottomNav — this grows the bottom nav from 5 to 6 items, intentionally
// (a judgment call, not a silent decision: flagged in the v1.5 code-docs
// for forge-ux/forge-qa to revisit if 6 items proves too tight on mobile).
export const bottomNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/entries', label: 'Entries', icon: ClipboardList },
    { path: '/recycle-bin', label: 'Bin', icon: Trash2 },
    { path: '/accounts', label: 'Accounts', icon: Wallet },
    { path: '/export', label: 'Export', icon: Download },
    { path: '/settings', label: 'Settings', icon: Settings },
];