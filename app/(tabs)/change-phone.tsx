import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { globalStyles } from "@/utils/globalStyles";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PHONE_REGEX = /^[0-9]{10}$/;

export default function ChangePhoneScreen() {
    const { user, setUser } = useSession();
    const { updatePhone, isLoading, error, success, clearMessages } = useProfile();

    const [phone, setPhone] = useState("");
    const [phoneError, setPhoneError] = useState<string | undefined>();

    const validate = (): boolean => {
        if (!phone.trim()) { setPhoneError("El teléfono es obligatorio."); return false; }
        if (!PHONE_REGEX.test(phone.trim())) { setPhoneError("Ingresa un número de 10 dígitos válido."); return false; }
        setPhoneError(undefined);
        return true;
    };

    const handleSubmit = async () => {
        clearMessages();
        if (!validate()) return;
        const ok = await updatePhone({ userId: user!.id, newPhone: phone.trim() });
        if (ok && user) {
            // Actualizar sesión local
            await setUser({ ...user, phone: phone.trim() });
            setPhone("");
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0C1F5C" />
            <View style={styles.blobTR} />

            <KeyboardAvoidingView style={globalStyles.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <SafeAreaView style={globalStyles.flex1}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Back */}
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.65)" />
                            <Text style={styles.backText}>Volver al perfil</Text>
                        </TouchableOpacity>

                        {/* Header */}
                        <View style={styles.headerSection}>
                            <View style={styles.iconRing}>
                                <View style={styles.iconInner}>
                                    <Ionicons name="phone-portrait-outline" size={28} color={Colors.primary.light} />
                                </View>
                            </View>
                            <Text style={globalStyles.formTitle}>Cambiar teléfono</Text>
                            {user?.phone ? (
                                <Text style={styles.currentPhone}>Actual: {user.phone}</Text>
                            ) : null}
                        </View>

                        {/* Card */}
                        <View style={globalStyles.glassCard}>
                            <View style={styles.shimmer} />
                            <View style={styles.cardContent}>
                                {error && (
                                    <View style={globalStyles.errorBanner}>
                                        <View style={globalStyles.errorDot} />
                                        <Text style={globalStyles.errorBannerText}>{error}</Text>
                                    </View>
                                )}
                                {success && (
                                    <View style={styles.successBanner}>
                                        <Ionicons name="checkmark-circle-outline" size={16} color={Colors.status.success} />
                                        <Text style={styles.successText}>{success}</Text>
                                    </View>
                                )}

                                <InputField
                                    label="Nuevo teléfono"
                                    placeholder="10 dígitos"
                                    leftIcon="call-outline"
                                    keyboardType="phone-pad"
                                    dark
                                    returnKeyType="done"
                                    onSubmitEditing={handleSubmit}
                                    value={phone}
                                    onChangeText={(t) => {
                                        setPhone(t.replace(/[^0-9]/g, ""));
                                        if (phoneError) setPhoneError(undefined);
                                        clearMessages();
                                    }}
                                    error={phoneError}
                                    maxLength={10}
                                />

                                <PrimaryButton
                                    label="Actualizar teléfono"
                                    onPress={handleSubmit}
                                    isLoading={isLoading}
                                    disabled={isLoading}
                                    variant="light"
                                />
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0C1F5C" },
    blobTR: {
        position: "absolute", top: -60, right: -70,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: "rgba(59,130,246,0.12)",
    },
    scrollContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48, gap: 28 },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
    backText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: "rgba(255,255,255,0.55)" },
    headerSection: { alignItems: "center", gap: 10 },
    iconRing: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: "rgba(59,130,246,0.12)",
        borderWidth: 1.5, borderColor: "rgba(59,130,246,0.28)",
        alignItems: "center", justifyContent: "center",
    },
    iconInner: {
        width: 58, height: 58, borderRadius: 29,
        backgroundColor: "rgba(255,255,255,0.06)",
        alignItems: "center", justifyContent: "center",
    },
    currentPhone: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "rgba(255,255,255,0.38)",
    },
    shimmer: { height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
    cardContent: { padding: 24, paddingTop: 28 },
    successBanner: {
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: "rgba(5,150,105,0.12)",
        borderWidth: 1, borderColor: "rgba(5,150,105,0.30)",
        borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
    },
    successText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: "#6EE7B7", flex: 1 },
});