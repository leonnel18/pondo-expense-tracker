import { Link, useLocation } from 'react-router-dom';
import { bottomNavItems } from '../lib/navigation';

const BottomNav = () => {
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-800 text-brand-200 z-40 border-t border-brand-700"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <ul className="flex justify-around items-center h-16">
                {bottomNavItems.map((item) => {
                    const IconComponent = item.icon;
                    const active = isActive(item.path);
                    return (
                        <li key={item.path} className="flex-1">
                            <Link
                                to={item.path}
                                className={`flex flex-col items-center justify-center h-full px-1 text-xs font-medium transition-colors ${
                                    active
                                        ? 'text-white'
                                        : 'text-brand-400 hover:text-brand-200'
                                }`}
                            >
                                <IconComponent
                                    className={`w-5 h-5 mb-1 ${active ? 'text-white' : ''}`}
                                    strokeWidth={active ? 2.5 : 2}
                                />
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default BottomNav;