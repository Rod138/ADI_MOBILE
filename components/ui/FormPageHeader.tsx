import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface FormPageHeaderProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    theme?: "dark" | "light";
}

export default function FormPageHeader({
    icon,
    title,
    subtitle,
    theme = "dark",
}: FormPageHeaderProps) {
    const isLight = theme === "light";

    return (
        <View style={styles.container}>
            <View style={[styles.iconRing, isLight ? styles.iconRingLight : styles.iconRingDark]}>
                <View style={[styles.iconInner, isLight ? styles.iconInnerLight : styles.iconInnerDark]}>
                    <Ionicons name={icon} size={26} color={Colors.primary.light} />
                </View>
            </View>
            <Text style={[styles.title, isLight ? styles.titleLight : styles.titleDark]}>
                {title}
            </Text>
            {subtitle ? (
                <Text style={[styles.subtitle, isLight ? styles.subtitleLight : styles.subtitleDark]}>
                    {subtitle}
                </Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: "center", gap: 12 },
    iconRing: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 1.5,
        alignItems: "center", justifyContent: "center",
    },
    iconRingDark: {
        backgroundColor: "rgba(59,130,246,0.12)",
        borderColor: "rgba(59,130,246,0.28)",
    },
    iconRingLight: {
        backgroundColor: Colors.screen.chipBlue,
        borderColor: Colors.screen.border,
    },
    iconInner: {
        width: 52, height: 52, borderRadius: 26,
        alignItems: "center", justifyContent: "center",
    },
    iconInnerDark: { backgroundColor: "rgba(255,255,255,0.06)" },
    iconInnerLight: { backgroundColor: Colors.screen.card },
    title: { fontFamily: "Outfit_700Bold", fontSize: 22, textAlign: "center" },
    titleDark: { color: "#FFFFFF" },
    titleLight: { color: Colors.screen.textPrimary },
    subtitle: { fontFamily: "Outfit_400Regular", fontSize: 13 },
    subtitleDark: { color: "rgba(255,255,255,0.38)" },
    subtitleLight: { color: Colors.screen.textSecondary },
});