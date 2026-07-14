import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AuthGate({ children }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // Show loading spinner while checking session
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirect to sign-in, preserving the intended destination (FR-A14)
        return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
    }

    return children;
}