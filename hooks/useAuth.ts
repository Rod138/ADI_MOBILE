// hooks/useAuth.ts
import supabase from "@/lib/supabase";
import { comparePassword } from "@/utils/bcrypt";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthUser {
    id: number;
    name: string;
    ap?: string;
    am?: string;
    email: string;
    phone: string;
    dep_id: number;
    rol_id: number;
}

const API_BASE_URL = "https://adi-web.onrender.com";

export function useAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = async (credentials: LoginCredentials): Promise<AuthUser | null> => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Buscar por email (ya no filtramos por password en la query)
            const { data: user, error: dbError } = await supabase
                .from("users")
                .select("id, name, ap, am, email, phone, dep_id, rol_id, password")
                .eq("email", credentials.email)
                .single();

            if (dbError || !user) {
                setError("Credenciales no válidas.");
                return null;
            }

            // 2. Comparar la contraseña con bcrypt
            const isMatch = await comparePassword(credentials.password, user.password);
            if (!isMatch) {
                setError("Credenciales no válidas.");
                return null;
            }

            if (!user.rol_id || user.rol_id <= 0) {
                setError("Credenciales no válidas.");
                return null;
            }

            // 3. Guardar sesión sin exponer el hash
            const sessionUser: AuthUser = {
                id: user.id,
                name: user.name,
                ap: user.ap,
                am: user.am,
                email: user.email,
                phone: user.phone,
                dep_id: user.dep_id,
                rol_id: user.rol_id,
            };

            await SecureStore.setItemAsync("token", String(user.id));
            await SecureStore.setItemAsync("session_user", JSON.stringify(sessionUser));

            return sessionUser;
        } catch {
            setError("Error interno. Intenta de nuevo.");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const forgotPassword = async (email: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 500) {
                    setError("El servicio de correo no está disponible.");
                    return false;
                }
                setError(data?.message ?? "No se pudo procesar la solicitud.");
                return false;
            }

            return data?.success === true;
        } catch (e: any) {
            console.error("[ForgotPassword] Network error:", e?.message);
            setError("No se pudo conectar al servidor. Verifica tu conexión.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync("token");
        await SecureStore.deleteItemAsync("session_user");
    };

    const clearError = () => setError(null);

    return { login, forgotPassword, logout, isLoading, error, clearError };
}