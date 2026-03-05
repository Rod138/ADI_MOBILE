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

        try {
            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();

            if (!response.ok) {
                const message =
                    data?.message ||
                    (response.status === 401
                        ? "Correo o contraseña incorrectos."
                        : "Error al iniciar sesión. Intenta de nuevo.");
                setError(message);
                return null;
            }

            // Guardar token de forma segura
            await SecureStore.setItemAsync("token", data.token);

            return data as AuthResponse;
        } catch {
            setError("No se pudo conectar al servidor. Verifica tu conexión.");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync("token");
        // El componente que llame a logout debe hacer router.replace("/login")
    };

    const clearError = () => setError(null);

    return { login, logout, isLoading, error, clearError };
}