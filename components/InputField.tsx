import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from "react-native";

interface InputFieldProps extends TextInputProps {
    label: string;
    error?: string;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    isPassword?: boolean;
    /** "dark" = sobre fondo oscuro (login/forgot), "light" = sobre fondo claro (tabs) */
    theme?: "dark" | "light";
    /** @deprecated usar theme="dark" */
    dark?: boolean;
}

export default function InputField({
    label,
    error,
    leftIcon,
    isPassword = false,
    theme,
    dark = false,
    value,
    onFocus,
    onBlur,
    ...rest
}: InputFieldProps) {
    // Retrocompatibilidad: si pasan dark=true sin theme, usar dark
    const isDark = theme ? theme === "dark" : dark;

    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const focusAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = (e: any) => {
        setIsFocused(true);
        Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
        onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
        onBlur?.(e);
    };

    const borderColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: error
            ? (isDark ? ["#FCA5A5", "#FCA5A5"] : ["#FECACA", "#EF4444"])
            : isDark
                ? ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.85)"]
                : [Colors.screen.border, Colors.primary.light],
    });

    const backgroundColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: isDark
            ? ["rgba(255,255,255,0.07)", "rgba(255,255,255,0.14)"]
            : [Colors.screen.card, "#F0F6FF"],
    });

    const iconColor = error
        ? (isDark ? "#FCA5A5" : Colors.status.error)
        : isFocused
            ? (isDark ? "#FFFFFF" : Colors.primary.light)
            : (isDark ? "rgba(255,255,255,0.40)" : Colors.screen.iconMuted);

    const labelColor = isDark ? "rgba(255,255,255,0.65)" : Colors.screen.textSecondary;
    const textColor = isDark ? "#FFFFFF" : Colors.screen.textPrimary;
    const placeholderColor = isDark ? "rgba(255,255,255,0.32)" : Colors.screen.textMuted;
    const errorColor = isDark ? "#FCA5A5" : Colors.status.error;

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: labelColor }]}>{label}</Text>

            <Animated.View style={{
                flexDirection: "row", alignItems: "center",
                borderRadius: 12, paddingHorizontal: 14, height: 52,
                borderWidth: 1.5, borderColor, backgroundColor,
            }}>
                {leftIcon && (
                    <Ionicons name={leftIcon} size={18} color={iconColor} style={{ marginRight: 10 }} />
                )}
                <TextInput
                    style={{ flex: 1, fontSize: 15, fontFamily: "Outfit_400Regular", color: textColor }}
                    placeholderTextColor={placeholderColor}
                    secureTextEntry={isPassword && !showPassword}
                    value={value}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...rest}
                />
                {isPassword && (
                    <TouchableOpacity
                        onPress={() => setShowPassword((v) => !v)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={18}
                            color={isDark ? "rgba(255,255,255,0.45)" : Colors.screen.iconMuted}
                        />
                    </TouchableOpacity>
                )}
            </Animated.View>

            {error && (
                <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={12} color={errorColor} />
                    <Text style={[styles.errorText, { color: errorColor }]}>{error}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 18 },
    label: {
        fontFamily: "Outfit_700Bold",
        fontSize: 11,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        marginBottom: 8,
    },
    errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12 },
});