import { Colors } from "@/constants/colors";
import React, { useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";

interface PrimaryButtonProps {
    label: string;
    onPress: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    variant?: "default" | "light";
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

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isDisabled}
                activeOpacity={1}
                style={[
                    styles.buttonBase,
                    isDisabled ? styles.buttonDisabled : (isLight ? styles.buttonLight : styles.buttonPrimary),
                    !isDisabled && (isLight ? styles.shadowLight : styles.shadowPrimary)
                ]}
            >
                {/* Shine overlay */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.shineOverlay,
                        {
                            backgroundColor: isLight
                                ? "rgba(255,255,255,0.30)"
                                : "rgba(255,255,255,0.10)",
                        }
                    ]}
                />

                {isLoading ? (
                    <ActivityIndicator
                        color={isLight ? Colors.primary.main : "#FFFFFF"}
                        size="small"
                    />
                ) : (
                    <Text
                        style={[
                            styles.textBase,
                            isDisabled && styles.textDisabled,
                            isLight ? styles.textLight : styles.textPrimary
                        ]}
                    >
                        {label.toUpperCase()}
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    buttonBase: {
        height: 56, // 14 * 4
        borderRadius: 16, // rounded-2xl
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
    shineOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "50%",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    textBase: {
        fontSize: 13,
        fontWeight: "800",
        letterSpacing: 1.5,
    },
    textDisabled: {
        opacity: 0.5,
    },
    textLight: {
        color: Colors.primary.main,
    },
    textPrimary: {
        color: Colors.white,
    },
});
