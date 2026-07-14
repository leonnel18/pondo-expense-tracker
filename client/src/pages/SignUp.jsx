import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSystemStatus } from '../lib/api';

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFirstUser, setIsFirstUser] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const { signUp, error } = useAuth();
    const navigate = useNavigate();

    // Check if this is the first user (for re-onboarding flow)
    useEffect(() => {
        const checkFirstUser = async () => {
            try {
                const status = await getSystemStatus();
                setIsFirstUser(!status.has_users);
            } catch (err) {
                // If we can't check, assume it's not the first user
                setIsFirstUser(false);
            } finally {
                setIsChecking(false);
            }
        };
        
        checkFirstUser();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            // In a real app, we'd show this error to the user
            return;
        }
        
        if (password.length < 8) {
            // In a real app, we'd show this error to the user
            return;
        }
        
        setIsLoading(true);
        
        try {
            await signUp(email, password);
            navigate('/', { replace: true });
        } catch (err) {
            // Error is handled by AuthContext
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {isFirstUser ? 'Create your account' : 'Sign up for an account'}
                    </h2>
                    {isFirstUser && (
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Pondo now uses individual accounts. Create your account to access your existing data.
                        </p>
                    )}
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="text-sm text-red-700">
                                {error}
                            </div>
                        </div>
                    )}
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="sr-only">
                                Confirm Password
                            </label>
                            <input
                                id="confirm-password"
                                name="confirm-password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
                        >
                            {isLoading ? 'Creating account...' : 'Create account'}
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to="/signin" className="font-medium text-brand-600 hover:text-brand-500">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}