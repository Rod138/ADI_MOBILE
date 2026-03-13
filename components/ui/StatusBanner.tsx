import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type BannerType = "error" | "success" | "info" | "warning";

interface StatusBannerProps {
    type: BannerType;
    message: string;
    theme?: "dark" | "light";
}

const darkConfig: Record<BannerType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string }> = {
    error: { icon: "alert-circle-outline", color: "#FCA5A5", bg: "rgba(220,38,38,0.14)", border: "rgba(252,165,165,0.28)" },
    success: { icon: "checkmark-circle-outline", color: "#6EE7B7", bg: "rgba(5,150,105,0.12)", border: "rgba(5,150,105,0.30)" },
    info: { icon: "information-circle-outline", color: "#93C5FD", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.22)" },
    warning: { icon: "warning-outline", color: "#FCD34D", bg: "rgba(217,119,6,0.14)", border: "rgba(252,211,77,0.28)" },
};

const lightConfig: Record<BannerType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string }> = {
    error: { icon: "alert-circle-outline", color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" },
    success: { icon: "checkmark-circle-outline", color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" },
    info: { icon: "information-circle-outline", color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE" },
    warning: { icon: "warning-outline", color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
};

export default function StatusBanner({ type, message, theme = "dark" }: StatusBannerProps) {
    const cfg = theme === "light" ? lightConfig[type] : darkConfig[type];

    return (
        <View style={[styles.banner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            {type === "error" && theme === "dark" ? (
                <View style={[styles.dot, { backgroundColor: cfg.color }]} />
            ) : (
                <Ionicons name={cfg.icon} size={16} color={cfg.color} />
            )}
            <Text style={[styles.text, { color: cfg.color }]}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 20,
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    text: { fontFamily: "Outfit_500Medium", fontSize: 13, flex: 1, lineHeight: 18 },
});