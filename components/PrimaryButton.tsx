import { Colors } from "@/constants/colors";
import React, { useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";

interface PrimaryButtonProps {
    label: string;
    onPress: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    variant?: "default" | "light" | "orange";
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
    const isLight = variant === "light";
    const isOrange = variant === "orange";
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const getButtonStyle = () => {
        if (isDisabled) return styles.buttonDisabled;
        if (isLight) return styles.buttonLight;
        if (isOrange) return styles.buttonOrange;
        return styles.buttonPrimary;
    };

    const getShadowStyle = () => {
        if (isDisabled) return null;
        if (isLight) return styles.shadowLight;
        if (isOrange) return styles.shadowOrange;
        return styles.shadowPrimary;
    };

    const getShineColor = () => {
        if (isLight) return "rgba(255,255,255,0.30)";
        if (isOrange) return "rgba(255,255,255,0.20)";
        return "rgba(255,255,255,0.10)";
    };

    const getTextStyle = () => {
        if (isDisabled) return styles.textDisabled;
        if (isLight) return styles.textLight;
        if (isOrange) return styles.textOrange;
        return styles.textPrimary;
    };

    const getSpinnerColor = () => {
        if (isLight) return Colors.primary.main;
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
                style={[styles.buttonBase, getButtonStyle(), getShadowStyle()]}
            >
                {/* Shine overlay */}
                <Animated.View
                    pointerEvents="none"
                    style={[styles.shineOverlay, { backgroundColor: getShineColor() }]}
                />

                {isLoading ? (
                    <ActivityIndicator color={getSpinnerColor()} size="small" />
                ) : (
                    <Text style={[styles.textBase, getTextStyle()]}>
                        {label.toUpperCase()}
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    buttonBase: {
        height: 56,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    buttonDisabled: {
        backgroundColor: "rgba(255,255,255,0.30)",
    },
    buttonLight: {
        backgroundColor: Colors.white,
    },
    buttonPrimary: {
        backgroundColor: Colors.primary.main,
    },
    buttonOrange: {
        backgroundColor: Colors.secondary.main,  // #F97316
    },
    shadowLight: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 6,
    },
    shadowPrimary: {
        shadowColor: Colors.primary.main,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 8,
    },
    shadowOrange: {
        shadowColor: Colors.secondary.main,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.40,
        shadowRadius: 16,
        elevation: 8,
    },
    shineOverlay: {
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: "50%",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    textBase: {
        fontSize: 13,
        fontWeight: "800",
        letterSpacing: 1.5,
    },
    textDisabled: { opacity: 0.5 },
    textLight: { color: Colors.primary.main },
    textPrimary: { color: Colors.white },
    textOrange: { color: Colors.white },
});