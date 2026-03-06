import { Colors } from "@/constants/colors";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

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
        router.replace("/(tabs)" as any);
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
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary.main} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutral[50], // "#F9FAFB"
  },
});