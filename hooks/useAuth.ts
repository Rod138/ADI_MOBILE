// hooks/useAuth.ts
import supabase from "@/lib/supabase";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthUser {
    id: number;
    name: string;
    ap: string;
    am: string;
    email: string;
    phone: string;
    dep_id: number;
    rol_id: number;
}

const API_BASE_URL = "https://adi-web.onrender.com";

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
                .select("id, name, ap, am, email, phone, dep_id, rol_id")
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

            await SecureStore.setItemAsync("token", String(user.id));
            await SecureStore.setItemAsync("session_user", JSON.stringify(user));

            return user as AuthUser;
        } catch {
            setError("Error interno. Intenta de nuevo.");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // ── Forgot Password — conectado al backend real ──────────────────────────
    const forgotPassword = async (email: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                // El backend retorna 500 si el servicio de correo no está configurado
                if (response.status === 500) {
                    setError("El servicio de correo no está disponible.");
                    return false;
                }
                setError(data?.message ?? "No se pudo procesar la solicitud.");
                return false;
            }

            // El backend siempre retorna success: true (respuesta neutra por seguridad)
            // aunque el correo no exista — esto es intencional para no exponer emails
            return data?.success === true;

        } catch (e: any) {
            console.error("[ForgotPassword] Network error:", e?.message);
            setError("No se pudo conectar al servidor. Verifica tu conexión.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Logout
    const logout = async () => {
        await SecureStore.deleteItemAsync("token");
        await SecureStore.deleteItemAsync("session_user");
    };

    const clearError = () => setError(null);

    return { login, forgotPassword, logout, isLoading, error, clearError };
}