import { Colors } from "@/constants/colors";
import React, { useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";

interface PrimaryButtonProps {
    label: string;
    onPress: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    variant?: "default" | "light" | "orange" | "ghost";
}

export default function PrimaryButton({
    label,
    onPress,
    isLoading = false,
    disabled = false,
    style,
    variant = "default",
}: PrimaryButtonProps) {
    const isDisabled = disabled || isLoading;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.975,
            useNativeDriver: true,
            speed: 60,
            bounciness: 2,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 40,
            bounciness: 4,
        }).start();
    };

    const getStyle = () => {
        if (isDisabled) return styles.disabled;
        switch (variant) {
            case "light": return styles.light;
            case "orange": return styles.orange;
            case "ghost": return styles.ghost;
            default: return styles.primary;
        }
    };

    const getTextStyle = () => {
        if (isDisabled) return styles.textDisabled;
        switch (variant) {
            case "light": return styles.textLight;
            case "ghost": return styles.textGhost;
            default: return styles.textDefault;
        }
    };

    const getSpinnerColor = () => {
        if (variant === "light" || variant === "ghost") return Colors.primary.main;
        return "#FFFFFF";
    };

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isDisabled}
                activeOpacity={1}
                style={[styles.base, getStyle()]}
            >
                {isLoading ? (
                    <ActivityIndicator color={getSpinnerColor()} size="small" />
                ) : (
                    <Text style={[styles.textBase, getTextStyle()]}>
                        {label}
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    base: {
        height: 52,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    primary: {
        backgroundColor: Colors.primary.main,
        shadowColor: Colors.primary.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    light: {
        backgroundColor: Colors.primary.soft,
        borderWidth: 1.5,
        borderColor: Colors.primary.muted,
    },
    orange: {
        backgroundColor: Colors.secondary.main,
        shadowColor: Colors.secondary.main,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    ghost: {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: Colors.screen.border,
    },
    disabled: {
        backgroundColor: Colors.neutral[200],
    },

    textBase: {
        fontFamily: "Outfit_700Bold",
        fontSize: 15,
        letterSpacing: 0.3,
    },
    textDefault: {
        color: Colors.white,
    },
    textLight: {
        color: Colors.primary.dark,
    },
    textGhost: {
        color: Colors.screen.textSecondary,
    },
    textDisabled: {
        color: Colors.screen.textMuted,
        fontFamily: "Outfit_500Medium",
    },
});