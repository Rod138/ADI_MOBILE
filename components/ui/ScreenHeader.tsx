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
}

export default function ScreenHeader({
    title,
    theme = "light",
    logoImage,
    logoIcon,
    rightActions = [],
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
                        <Ionicons name={logoIcon} size={16} color={Colors.primary.main} />
                    ) : null}
                </View>
                <Text style={[styles.title, isLight ? styles.titleLight : styles.titleDark]}>
                    {title}
                </Text>
            </View>

            {/* Derecha */}
            {rightActions.length > 0 && (
                <View style={styles.right}>
                    {rightActions.map((action, i) => (
                        <TouchableOpacity key={i} onPress={action.onPress} style={styles.iconBtn}>
                            <Ionicons
                                name={action.icon}
                                size={24}
                                color={
                                    action.badge
                                        ? (action.activeColor ?? Colors.primary.main)
                                        : isLight ? Colors.screen.textSecondary : "rgba(255,255,255,0.75)"
                                }
                            />
                            {action.badge && (
                                <View style={[
                                    styles.badgeDot,
                                    { borderColor: isLight ? Colors.screen.bg : "#1C1C1C" },
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
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerLight: {
        backgroundColor: Colors.screen.card,
        borderBottomColor: Colors.screen.border,
    },
    headerDark: {
        backgroundColor: "#1C1C1C",
        borderBottomColor: "rgba(255,255,255,0.07)",
    },
    left: { flexDirection: "row", alignItems: "center", gap: 10 },
    logoCircle: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
    },
    logoCircleWhite: { backgroundColor: "#FFFFFF" },
    logoCircleGreenBg: {
        backgroundColor: Colors.primary.soft,
        borderWidth: 1,
        borderColor: Colors.screen.border,
    },
    logoCircleGreenTransp: {
        backgroundColor: "rgba(132,204,22,0.15)",
        borderWidth: 1,
        borderColor: "rgba(132,204,22,0.30)",
    },
    logoImg: { width: 32, height: 32 },
    title: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
        letterSpacing: 0.5,
    },
    titleLight: { color: Colors.screen.textPrimary },
    titleDark: { color: "#FFFFFF" },
    right: { flexDirection: "row", alignItems: "center", gap: 4 },
    iconBtn: { padding: 6, position: "relative" },
    badgeDot: {
        position: "absolute", top: 4, right: 4,
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: Colors.primary.main,
        borderWidth: 1.5,
    },
});