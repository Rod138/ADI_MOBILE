import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";
import { BackButton, FormPageHeader, ScreenShell, SectionCard, StatusBanner } from "@/components/ui";
import { useSession } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { router } from "expo-router";
import { useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ChangeEmailScreen() {
    const { user, setUser } = useSession();
    const { updateEmail, isLoading, error, success, clearMessages } = useProfile();

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState<string | undefined>();

    const validate = (): boolean => {
        if (!email.trim()) {
            setEmailError("El correo electrónico es obligatorio.");
            return false;
        }
        if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
            setEmailError("Ingresa un correo electrónico válido.");
            return false;
        }
        setEmailError(undefined);
        return true;
    };

    const handleSubmit = async () => {
        clearMessages();
        if (!validate()) return;
        const cleanEmail = email.trim().toLowerCase();
        const ok = await updateEmail({ userId: user!.id, newEmail: cleanEmail });
        if (ok && user) {
            await setUser({ ...user, email: cleanEmail });
            setEmail("");
        }
    };

    return (
        <ScreenShell theme="light" scroll>
            <BackButton theme="light" label="Volver al perfil" onPress={() => router.replace("/(tabs)/profile")} />

            <FormPageHeader
                theme="light"
                icon="mail-outline"
                title="Cambiar correo electrónico"
                subtitle={user?.email ? `Actual: ${user.email}` : undefined}
            />

            <SectionCard theme="light">
                {error && <StatusBanner theme="light" type="error" message={error} />}
                {success && <StatusBanner theme="light" type="success" message={success} />}

                <InputField
                    theme="light"
                    label="Nuevo correo electrónico"
                    placeholder="correo@ejemplo.com"
                    leftIcon="mail-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    value={email}
                    onChangeText={(t) => {
                        setEmail(t.replace(/[^a-zA-Z0-9.@_-]/g, ""));
                        if (emailError) setEmailError(undefined);
                        clearMessages();
                    }}
                    error={emailError}
                    maxLength={320}
                />

                <PrimaryButton
                    label="Actualizar correo"
                    onPress={handleSubmit}
                    isLoading={isLoading}
                    disabled={isLoading}
                />
            </SectionCard>
        </ScreenShell>
    );
}
