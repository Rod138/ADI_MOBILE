import { Colors } from "@/constants/colors";
import React, { useRef } from "react";
import { ActivityIndicator, Animated, Text, TouchableOpacity, ViewStyle } from "react-native";

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
                className={[
                    "h-14 rounded-2xl items-center justify-center overflow-hidden",
                    isDisabled
                        ? "bg-white/30"
                        : isLight
                            ? "bg-white"
                            : "bg-blue-900",
                ].join(" ")}
                style={
                    !isDisabled
                        ? isLight
                            ? {
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: 0.22,
                                shadowRadius: 14,
                                elevation: 6,
                            }
                            : {
                                shadowColor: Colors.primary.main,
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.45,
                                shadowRadius: 16,
                                elevation: 8,
                            }
                        : undefined
                }
            >
                {/* Shine overlay */}
                <Animated.View
                    pointerEvents="none"
                    className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl"
                    style={{
                        backgroundColor: isLight
                            ? "rgba(255,255,255,0.30)"
                            : "rgba(255,255,255,0.10)",
                    }}
                />

                {isLoading ? (
                    <ActivityIndicator
                        color={isLight ? Colors.primary.main : "#FFFFFF"}
                        size="small"
                    />
                ) : (
                    <Text
                        className={[
                            "text-[13px] font-extrabold tracking-widest",
                            isDisabled ? "opacity-50" : "",
                            isLight ? "text-blue-900" : "text-white",
                        ].join(" ")}
                    >
                        {label.toUpperCase()}
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}
