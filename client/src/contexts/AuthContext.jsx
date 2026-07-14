import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  signIn as apiSignIn, 
  signUp as apiSignUp, 
  signOut as apiSignOut, 
  getAuthUser 
} from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);        // { id, email } or null
    const [isLoading, setIsLoading] = useState(true); // true during initial session check
    const [error, setError] = useState(null);

    // Check for existing session on mount (FR-A13)
    useEffect(() => {
        const checkSession = async () => {
            try {
                const data = await getAuthUser();
                setUser(data.user);
            } catch (err) {
                // No valid session — user is null (not an error state)
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkSession();
    }, []);

    const signIn = useCallback(async (email, password) => {
        setError(null);
        try {
            const data = await apiSignIn(email, password);
            setUser(data.user);
            return data.user;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const signUp = useCallback(async (email, password) => {
        setError(null);
        try {
            const data = await apiSignUp(email, password);
            setUser(data.user);
            return data.user;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const signOut = useCallback(async () => {
        setError(null);
        try {
            await apiSignOut();
            setUser(null);
        } catch (err) {
            setError(err.message);
            // Even if the API call fails, clear the user state locally
            setUser(null);
        }
    }, []);

    const refreshSession = useCallback(async () => {
        try {
            const data = await getAuthUser();
            setUser(data.user);
            return data.user;
        } catch {
            setUser(null);
            return null;
        }
    }, []);

    const value = {
        user,
        isLoading,
        error,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refreshSession,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}