import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface SessionUser {
    id: number;
    name: string;
    ap: string;
    am: string;
    email: string;
    phone: string;
    dep_id: number;
    rol_id: number;
}

interface AuthContextType {
    user: SessionUser | null;
    setUser: (user: SessionUser | null) => void;
    fullName: string;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    setUser: () => { },
    fullName: "",
    isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUserState] = useState<SessionUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const raw = await SecureStore.getItemAsync("session_user");
                if (raw) setUserState(JSON.parse(raw));
            } catch { }
            finally { setIsLoading(false); }
        };
        restoreSession();
    }, []);

    const setUser = async (u: SessionUser | null) => {
        setUserState(u);
        if (u) await SecureStore.setItemAsync("session_user", JSON.stringify(u));
        else await SecureStore.deleteItemAsync("session_user");
    };

    const fullName = user
        ? `${user.name} ${user.ap}${user.am ? " " + user.am : ""}`.trim()
        : "";

    return (
        <AuthContext.Provider value={{ user, setUser, fullName, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useSession = () => useContext(AuthContext);