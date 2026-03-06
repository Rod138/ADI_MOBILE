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
    dark?: boolean;
}

export default function InputField({
    label,
    error,
    leftIcon,
    isPassword = false,
    dark = false,
    value,
    onFocus,
    onBlur,
    ...rest
}: InputFieldProps) {
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

    // Animated border & background — these can't be className, need interpolation
    const borderColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: error
            ? ["#FCA5A5", "#FCA5A5"]
            : dark
                ? ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.85)"]
                : [Colors.neutral[200], Colors.primary.light],
    });

    const backgroundColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: dark
            ? ["rgba(255,255,255,0.07)", "rgba(255,255,255,0.14)"]
            : ["#FFFFFF", "#F0F7FF"],
    });

    const iconColor = error
        ? dark ? "#FCA5A5" : Colors.status.error
        : isFocused
            ? dark ? "#FFFFFF" : Colors.primary.light
            : dark ? "rgba(255,255,255,0.40)" : Colors.neutral[400];

    return (
        <View style={styles.container}>
            {/* Label */}
            <Text
                style={[
                    styles.labelBase,
                    dark ? styles.labelDark : styles.labelLight
                ]}
            >
                {label}
            </Text>

            {/* Animated container — uses style prop for animated values */}
            <Animated.View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    height: 54,
                    borderWidth: 1.5,
                    borderColor,
                    backgroundColor,
                }}
            >
                {leftIcon && (
                    <Ionicons
                        name={leftIcon}
                        size={18}
                        color={iconColor}
                        style={{ marginRight: 12 }}
                    />
                )}

                <TextInput
                    style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: "500",
                        color: dark ? "#FFFFFF" : Colors.neutral[900],
                    }}
                    placeholderTextColor={
                        dark ? "rgba(255,255,255,0.32)" : Colors.neutral[400]
                    }
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
                        style={styles.eyeBtn}
                    >
                        <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={18}
                            color={dark ? "rgba(255,255,255,0.45)" : Colors.neutral[400]}
                        />
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* Error */}
            {error && (
                <View style={styles.errorRow}>
                    <Ionicons
                        name="alert-circle-outline"
                        size={12}
                        color={dark ? "#FCA5A5" : Colors.status.error}
                    />
                    <Text
                        style={[
                            styles.errorTextBase,
                            dark ? styles.errorTextDark : styles.errorTextLight
                        ]}
                    >
                        {error}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 18,
    },
    labelBase: {
        fontSize: 11,
        fontWeight: "bold",
        letterSpacing: 1.2,
        textTransform: "uppercase",
        marginBottom: 8,
    },
    labelDark: {
        color: "rgba(255,255,255,0.65)",
    },
    labelLight: {
        color: Colors.neutral[700],
    },
    eyeBtn: {
        paddingLeft: 8,
    },
    errorRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        gap: 4,
    },
    errorTextBase: {
        fontSize: 12,
        fontWeight: "500",
    },
    errorTextDark: {
        color: "#FCA5A5",
    },
    errorTextLight: {
        color: Colors.status.error,
    },
});