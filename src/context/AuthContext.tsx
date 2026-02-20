'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Models, OAuthProvider } from 'appwrite';
import { account } from '@/lib/appwrite';

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    loading: boolean;
    loginWithGoogle: () => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [loading, setLoading] = useState(true);

    const checkSession = useCallback(async () => {
        try {
            const u = await account.get();
            setUser(u);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { checkSession(); }, [checkSession]);

    const loginWithGoogle = () => {
        account.createOAuth2Session(
            OAuthProvider.Google,
            `${window.location.origin}/quests`,   // success redirect
            `${window.location.origin}/login`,     // failure redirect
        );
    };

    const logout = async () => {
        try { await account.deleteSession('current'); } catch { /* already logged out */ }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be within AuthProvider');
    return ctx;
}
