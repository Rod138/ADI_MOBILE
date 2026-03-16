import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";
import { BackButton, FormPageHeader, ScreenShell, SectionCard, StatusBanner } from "@/components/ui";
import { useSession } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { router } from "expo-router";
import { useState } from "react";

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
            await setUser({ ...user, phone: phone.trim() });
            setPhone("");
        }
    };

    return (
        <ScreenShell theme="light" scroll>
            <BackButton theme="light" label="Volver al perfil" onPress={() => router.replace("/(tabs)/profile")} />

            <FormPageHeader
                theme="light"
                icon="phone-portrait-outline"
                title="Cambiar teléfono"
                subtitle={user?.phone ? `Actual: ${user.phone}` : undefined}
            />

            <SectionCard theme="light">
                {error && <StatusBanner theme="light" type="error" message={error} />}
                {success && <StatusBanner theme="light" type="success" message={success} />}

                <InputField
                    theme="light"
                    label="Nuevo teléfono"
                    placeholder="10 dígitos"
                    leftIcon="call-outline"
                    keyboardType="phone-pad"
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
                />
            </SectionCard>
        </ScreenShell>
    );
}