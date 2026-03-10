import supabase from "@/lib/supabase";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    phone: string;
    rol_id: number;
    dep_id: string;
}

// Hook principal
export function useAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Login
    const login = async (credentials: LoginCredentials): Promise<AuthUser | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const { data: user, error: dbError } = await supabase
                .from("users")
                .select("*")
                .eq("email", credentials.email)
                .eq("password", credentials.password)
                .single();

            if (dbError || !user) {
                setError("Credenciales no válidas.");
                return null;
            }

            if (!user.rol_id || user.rol_id <= 0) {
                setError("Credenciales no válidas.");
                return null;
            }

            // Guardar id de sesión de forma segura
            await SecureStore.setItemAsync("token", String(user.id));

            return user as AuthUser;
        } catch {
            setError("Error interno. Intenta de nuevo.");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // ── Forgot password ────────────────────────
    // TODO: implementar cuando el flujo de reset esté definido en Supabase
    const forgotPassword = async (email: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        await new Promise((resolve) => setTimeout(resolve, 1500));

        setIsLoading(false);
        return true;
    };

    // ── Logout ─────────────────────────────────
    const logout = async () => {
        await SecureStore.deleteItemAsync("token");
        // El componente que llame a logout debe hacer router.replace("/login")
    };

    const clearError = () => setError(null);

    return { login, forgotPassword, logout, isLoading, error, clearError };
}