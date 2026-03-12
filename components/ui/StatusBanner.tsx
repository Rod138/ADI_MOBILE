/**
 * StatusBanner
 * ------------
 * Banner de estado reutilizable para formularios.
 * Soporta variantes: error | success | info | warning
 *
 * Uso:
 *   <StatusBanner type="error" message="Credenciales incorrectas." />
 *   <StatusBanner type="success" message="Contraseña actualizada." />
 *   <StatusBanner type="info" message="Revisa tu bandeja de spam." />
 */

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type BannerType = "error" | "success" | "info" | "warning";

interface StatusBannerProps {
    type: BannerType;
    message: string;
}

const config: Record<BannerType, {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    border: string;
}> = {
    error: {
        icon: "alert-circle-outline",
        color: "#FCA5A5",
        bg: "rgba(220,38,38,0.14)",
        border: "rgba(252,165,165,0.28)",
    },
    success: {
        icon: "checkmark-circle-outline",
        color: "#6EE7B7",
        bg: "rgba(5,150,105,0.12)",
        border: "rgba(5,150,105,0.30)",
    },
    info: {
        icon: "information-circle-outline",
        color: "rgba(147,197,253,0.85)",
        bg: "rgba(59,130,246,0.10)",
        border: "rgba(59,130,246,0.22)",
    },
    warning: {
        icon: "warning-outline",
        color: "#FCD34D",
        bg: "rgba(217,119,6,0.14)",
        border: "rgba(252,211,77,0.28)",
    },
};

export default function StatusBanner({ type, message }: StatusBannerProps) {
    const { icon, color, bg, border } = config[type];

    return (
        <View
            style={[
                styles.banner,
                { backgroundColor: bg, borderColor: border },
            ]}
        >
            {type === "error" ? (
                <View style={[styles.dot, { backgroundColor: color }]} />
            ) : (
                <Ionicons name={icon} size={16} color={color} />
            )}
            <Text style={[styles.text, { color }]}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 20,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    text: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        flex: 1,
    },
});