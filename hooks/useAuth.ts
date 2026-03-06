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
    role: "resident" | "admin";
    condominiumId: string;
}

export interface AuthResponse {
    token: string;
    user: AuthUser;
}

// ─────────────────────────────────────────────
// Configuración de la API
// ─────────────────────────────────────────────
const BASE_URL = "https://api.tudominio.com";

// ─────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────
export function useAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = async (credentials: LoginCredentials): Promise<AuthResponse | null> => {
        setIsLoading(true);
        setError(null);

        // TODO: reemplazar con llamada real cuando el endpoint esté listo
        // POST ${BASE_URL}/auth/login  { email, password }
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setIsLoading(false);
        return {
            token: "mock-token",
            user: {
                id: "1",
                name: "Usuario Demo",
                email: credentials.email,
                role: "resident",
                condominiumId: "condo-1",
            },
        };
    };

    const forgotPassword = async (email: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        // TODO: reemplazar con llamada real cuando el endpoint esté listo
        // POST ${BASE_URL}/auth/forgot-password  { email }
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setIsLoading(false);
        return true;
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync("token");
        // El componente que llame a logout debe hacer router.replace("/login")
    };

    const clearError = () => setError(null);

    return { login, forgotPassword, logout, isLoading, error, clearError };
}