import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import {
    Image,
    ImageSourcePropType,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface HeaderAction {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    badge?: boolean;
    activeColor?: string;
}

interface ScreenHeaderProps {
    title: string;
    theme?: "dark" | "light";
    logoImage?: ImageSourcePropType;
    logoIcon?: keyof typeof Ionicons.glyphMap;
    rightActions?: HeaderAction[];
    subtitle?: string;
}

export default function ScreenHeader({
    title,
    theme = "light",
    logoImage,
    logoIcon,
    rightActions = [],
    subtitle,
}: ScreenHeaderProps) {
    const isLight = theme === "light";

    return (
        <View style={[styles.header, isLight ? styles.headerLight : styles.headerDark]}>
            {/* Izquierda */}
            <View style={styles.left}>
                <View style={[
                    styles.logoCircle,
                    logoImage
                        ? styles.logoCircleWhite
                        : isLight ? styles.logoCircleGreenBg : styles.logoCircleGreenTransp,
                ]}>
                    {logoImage ? (
                        <Image source={logoImage} style={styles.logoImg} resizeMode="contain" />
                    ) : logoIcon ? (
                        <Ionicons name={logoIcon} size={17} color={isLight ? Colors.primary.main : Colors.primary.light} />
                    ) : null}
                </View>
                <View style={styles.titleBlock}>
                    <Text style={[styles.title, isLight ? styles.titleLight : styles.titleDark]}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={[styles.subtitle, isLight ? styles.subtitleLight : styles.subtitleDark]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>

            {/* Derecha */}
            {rightActions.length > 0 && (
                <View style={styles.right}>
                    {rightActions.map((action, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={action.onPress}
                            style={[styles.iconBtn, isLight ? styles.iconBtnLight : styles.iconBtnDark]}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={action.icon}
                                size={20}
                                color={
                                    action.badge
                                        ? (action.activeColor ?? Colors.primary.main)
                                        : isLight ? Colors.screen.textSecondary : "rgba(255,255,255,0.80)"
                                }
                            />
                            {action.badge && (
                                <View style={[
                                    styles.badgeDot,
                                    { borderColor: isLight ? Colors.screen.bg : "#1A1A1A" },
                                ]} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerLight: {
        backgroundColor: Colors.screen.card,
        borderBottomColor: Colors.screen.border,
    },
    headerDark: {
        backgroundColor: "#1A1A1A",
        borderBottomColor: "rgba(255,255,255,0.06)",
    },
    left: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    titleBlock: { gap: 1 },
    logoCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    logoCircleWhite: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: Colors.screen.border,
    },
    logoCircleGreenBg: {
        backgroundColor: Colors.primary.soft,
        borderWidth: 1,
        borderColor: Colors.primary.muted,
    },
    logoCircleGreenTransp: {
        backgroundColor: "rgba(101,163,13,0.15)",
        borderWidth: 1,
        borderColor: "rgba(101,163,13,0.30)",
    },
    logoImg: { width: 30, height: 30 },
    title: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
        letterSpacing: 0.2,
    },
    titleLight: { color: Colors.screen.textPrimary },
    titleDark: { color: "#FFFFFF" },
    subtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
    },
    subtitleLight: { color: Colors.screen.textMuted },
    subtitleDark: { color: "rgba(255,255,255,0.40)" },
    right: { flexDirection: "row", alignItems: "center", gap: 6 },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    iconBtnLight: {
        backgroundColor: Colors.neutral[100],
        borderWidth: 1,
        borderColor: Colors.screen.border,
    },
    iconBtnDark: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "transparent",
    },
    badgeDot: {
        position: "absolute",
        top: 5,
        right: 5,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary.main,
        borderWidth: 1.5,
    },
});