import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type BannerType = "error" | "success" | "info" | "warning";

interface StatusBannerProps {
    type: BannerType;
    message: string;
    theme?: "dark" | "light";
}

const darkConfig: Record<BannerType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string }> = {
    error: { icon: "alert-circle-outline", color: "#FCA5A5", bg: "rgba(220,38,38,0.14)", border: "rgba(252,165,165,0.25)" },
    success: { icon: "checkmark-circle-outline", color: "#6EE7B7", bg: "rgba(5,150,105,0.12)", border: "rgba(5,150,105,0.28)" },
    info: { icon: "information-circle-outline", color: "#93C5FD", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.20)" },
    warning: { icon: "warning-outline", color: "#FCD34D", bg: "rgba(217,119,6,0.13)", border: "rgba(252,211,77,0.25)" },
};

const lightConfig: Record<BannerType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string }> = {
    error: { icon: "alert-circle-outline", color: Colors.status.error, bg: Colors.status.errorBg, border: Colors.status.errorBorder },
    success: { icon: "checkmark-circle-outline", color: Colors.status.success, bg: Colors.status.successBg, border: Colors.status.successBorder },
    info: { icon: "information-circle-outline", color: Colors.status.info, bg: Colors.status.infoBg, border: Colors.status.infoBorder },
    warning: { icon: "warning-outline", color: Colors.status.warning, bg: Colors.status.warningBg, border: Colors.status.warningBorder },
};

export default function StatusBanner({ type, message, theme = "dark" }: StatusBannerProps) {
    const cfg = theme === "light" ? lightConfig[type] : darkConfig[type];

    return (
        <View style={[styles.banner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Ionicons name={cfg.icon} size={16} color={cfg.color} />
            <Text style={[styles.text, { color: cfg.color }]}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
    },
    text: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
});