import { Colors } from "@/constants/colors";
import { StyleSheet } from "react-native";

export const globalStyles = StyleSheet.create({
    // Formatos Generales
    flex1: { flex: 1 },

    // Contenedores Base
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 48,
        gap: 40,
    },

    // Tipografía
    formTitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 28,
        color: Colors.white,
        letterSpacing: 0.2,
        textAlign: "center",
    },

    // UI Elements — glass card sobre fondo grafito
    glassCard: {
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.07)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.11)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.45,
        shadowRadius: 32,
        elevation: 20,
    },

    // Error banners
    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "rgba(220,38,38,0.14)",
        borderWidth: 1,
        borderColor: "rgba(252,165,165,0.28)",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 20,
    },
    errorDot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: "#FCA5A5",
    },
    errorBannerText: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        color: "#FCA5A5",
        flex: 1,
    },
});