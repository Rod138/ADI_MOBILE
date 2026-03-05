import { Colors } from "@/constants/colors";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

// Punto de entrada — verifica si hay sesión
// activa y redirige al destino correcto.
export default function Index() {
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (token) {
        //  Hay sesión guardada : ir al home
        router.replace("/(tabs)");
      } else {
        //  No hay sesión : ir al login
        router.replace("/login");
      }
    } catch {
      // Si falla la lectura del token, manda al login
      router.replace("/login");
    }
  };

  // Pantalla de carga mientras verifica
  return (
    <View className="flex-1 items-center justify-center bg-[#F9FAFB]">
      <ActivityIndicator size="large" color={Colors.primary.main} />
    </View>
  );
}