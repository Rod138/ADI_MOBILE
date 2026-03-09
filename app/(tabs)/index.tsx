import PrimaryButton from "@/components/PrimaryButton";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        router.replace("/login");
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0C1F5C" />

            {/* Blobs decorativos */}
            <View style={styles.blobTR} />
            <View style={styles.blobBL} />
            <View style={styles.blobC} />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>

                    {/* Icono */}
                    <View style={styles.iconRing}>
                        <View style={styles.iconInner}>
                            <Ionicons name="home-outline" size={32} color={Colors.primary.light} />
                        </View>
                    </View>

                    {/* Texto */}
                    <Text style={styles.title}>¡Bienvenido!</Text>
                    <Text style={styles.subtitle}>Has iniciado sesión correctamente.</Text>

                    {/* Separador */}
                    <View style={styles.divider} />

                    <Text style={styles.hint}>
                        Aquí irá el contenido principal de la aplicación.
                    </Text>

                    {/* Logout */}
                    <View style={styles.logoutWrapper}>
                        <PrimaryButton
                            label="Cerrar sesión"
                            onPress={handleLogout}
                            variant="light"
                        />
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#0C1F5C",
    },

    // Blobs — mismos que login/forgot-password
    blobTR: {
        position: "absolute", top: -60, right: -70,
        width: 260, height: 260, borderRadius: 130,
        backgroundColor: "rgba(59,130,246,0.15)",
    },
    blobBL: {
        position: "absolute", bottom: 80, left: -80,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: "rgba(109,40,217,0.12)",
    },
    blobC: {
        position: "absolute", top: "40%", right: -40,
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: "rgba(30,58,138,0.28)",
    },

    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        gap: 16,
    },

    // Icono
    iconRing: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(59,130,246,0.12)",
        borderWidth: 1.5,
        borderColor: "rgba(59,130,246,0.28)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    iconInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
    },

    // Texto
    title: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 32,
        color: Colors.white,
        letterSpacing: 0.3,
    },
    subtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: 15,
        color: "rgba(255,255,255,0.55)",
        textAlign: "center",
    },

    // Separador
    divider: {
        width: 48,
        height: 1.5,
        borderRadius: 1,
        backgroundColor: "rgba(255,255,255,0.12)",
        marginVertical: 8,
    },

    hint: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "rgba(255,255,255,0.30)",
        textAlign: "center",
        fontStyle: "italic",
    },

    logoutWrapper: {
        width: "100%",
        marginTop: 32,
    },
});