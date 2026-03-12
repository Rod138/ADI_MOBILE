/**
 * ScreenHeader
 * ------------
 * Barra de cabecera para las pantallas principales (tabs).
 * Renderiza:
 *  - Lado izquierdo: círculo con ícono/imagen + título
 *  - Lado derecho: slots para botones de acción (iconos)
 *
 * Uso básico:
 *   <ScreenHeader title="ADI" logoImage={require("@/assets/images/logo.png")} />
 *
 * Con ícono en lugar de imagen:
 *   <ScreenHeader title="Perfil" logoIcon="person" />
 *
 * Con acciones a la derecha:
 *   <ScreenHeader
 *     title="Incidencias"
 *     logoImage={require("...")}
 *     rightActions={[
 *       { icon: "person-circle-outline", onPress: () => router.push("/profile") },
 *       { icon: "options-outline", onPress: openDrawer, badge: hasFilter },
 *     ]}
 *   />
 */

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
    /** Muestra un punto indicador sobre el ícono */
    badge?: boolean;
    /** Color activo del ícono cuando badge=true */
    activeColor?: string;
}

interface ScreenHeaderProps {
    title: string;
    /** Imagen para el círculo izquierdo (ej: logo) */
    logoImage?: ImageSourcePropType;
    /** Ícono Ionicons para el círculo izquierdo */
    logoIcon?: keyof typeof Ionicons.glyphMap;
    /** Acciones del lado derecho */
    rightActions?: HeaderAction[];
}

export default function ScreenHeader({
    title,
    logoImage,
    logoIcon,
    rightActions = [],
}: ScreenHeaderProps) {
    return (
        <View style={styles.header}>
            {/* ── Izquierda ── */}
            <View style={styles.left}>
                <View style={[styles.logoCircle, logoImage ? styles.logoCircleWhite : styles.logoCircleBlue]}>
                    {logoImage ? (
                        <Image source={logoImage} style={styles.logoImg} resizeMode="contain" />
                    ) : logoIcon ? (
                        <Ionicons name={logoIcon} size={16} color={Colors.primary.light} />
                    ) : null}
                </View>
                <Text style={styles.title}>{title}</Text>
            </View>

            {/* ── Derecha ── */}
            {rightActions.length > 0 && (
                <View style={styles.right}>
                    {rightActions.map((action, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={action.onPress}
                            style={styles.iconBtn}
                        >
                            <Ionicons
                                name={action.icon}
                                size={24}
                                color={
                                    action.badge
                                        ? (action.activeColor ?? Colors.primary.light)
                                        : "rgba(255,255,255,0.75)"
                                }
                            />
                            {action.badge && <View style={styles.badgeDot} />}
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
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.07)",
    },
    left: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    logoCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    logoCircleWhite: {
        backgroundColor: "#FFFFFF",
    },
    logoCircleBlue: {
        backgroundColor: "rgba(59,130,246,0.15)",
        borderWidth: 1,
        borderColor: "rgba(59,130,246,0.3)",
    },
    logoImg: {
        width: 32,
        height: 32,
    },
    title: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
        color: "#FFFFFF",
        letterSpacing: 1,
    },
    right: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    iconBtn: {
        padding: 6,
        position: "relative",
    },
    badgeDot: {
        position: "absolute",
        top: 4,
        right: 4,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary.light,
        borderWidth: 1.5,
        borderColor: "#0C1F5C",
    },
});