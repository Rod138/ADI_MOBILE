import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";
import { BackButton, FormPageHeader, ScreenShell, SectionCard, StatusBanner } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useDepartments } from "@/hooks/useDepartments";
import supabase from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Keyboard,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;

const ROLES = [
    { id: 1, name: "Residente" },
    { id: 2, name: "Tesorero" },
    { id: 3, name: "Administrador" },
    { id: 4, name: "Tesorero y Admin" },
];

interface FormErrors {
    name?: string;
    ap?: string;
    email?: string;
    phone?: string;
    dep_id?: string;
    rol_id?: string;
}

// ── PickerField Component ───────────────────────────────────────────────────
function PickerField({ label, value, placeholder, options, onSelect, error, disabled = false, icon = "grid-outline" }: {
    label: string; value: number | undefined; placeholder: string;
    options: { id: number; name: string }[]; onSelect: (id: number) => void;
    error?: string; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap;
}) {
    const [open, setOpen] = useState(false);
    const selected = options.find((o) => o.id === value)?.name ?? "";

    return (
        <View style={pickStyles.container}>
            <Text style={pickStyles.label}>{label}</Text>
            <TouchableOpacity
                onPress={() => !disabled && setOpen(true)}
                style={[pickStyles.trigger, error && pickStyles.triggerError, disabled && pickStyles.triggerDisabled]}
                activeOpacity={disabled ? 1 : 0.8}
            >
                <Ionicons name={icon} size={17} color={Colors.screen.iconMuted} style={{ marginRight: 10 }} />
                <Text style={[pickStyles.triggerText, !selected && pickStyles.placeholder]}>
                    {selected || placeholder}
                </Text>
                <Ionicons name="chevron-down" size={15} color={Colors.screen.iconMuted} />
            </TouchableOpacity>
            {error ? (
                <View style={pickStyles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={12} color={Colors.status.error} />
                    <Text style={pickStyles.errorText}>{error}</Text>
                </View>
            ) : null}
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={pickStyles.overlay}>
                    <View style={pickStyles.sheet}>
                        <View style={pickStyles.handle} />
                        <Text style={pickStyles.sheetTitle}>{label}</Text>
                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                            {options.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={[pickStyles.option, value === opt.id && pickStyles.optionActive]}
                                >
                                    <Text style={[pickStyles.optionText, value === opt.id && pickStyles.optionTextActive]}>
                                        {opt.name}
                                    </Text>
                                    {value === opt.id && <Ionicons name="checkmark" size={17} color={Colors.primary.main} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity onPress={() => setOpen(false)} style={pickStyles.cancelBtn}>
                            <Text style={pickStyles.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ── Pantalla Principal ───────────────────────────────────────────────────────
export default function EditUserScreen() {
    const { userId, oldDepId } = useLocalSearchParams<{ userId: string; oldDepId: string }>();

    const {
        departments,
        isLoading: hookIsLoading,
        error: hookError,
        success: hookSuccess,
        clearMessages,
        fetchDepartments,
        updateUser,
    } = useDepartments();

    // Estados de carga del usuario
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Form states
    const [name, setName] = useState("");
    const [ap, setAp] = useState("");
    const [am, setAm] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [selectedDepId, setSelectedDepId] = useState<number | undefined>();
    const [selectedRolId, setSelectedRolId] = useState<number | undefined>();

    // Validation state
    const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

    useEffect(() => {
        const loadUser = async () => {
            setIsLoadingUser(true);
            setLoadError(null);
            try {
                const { data, error } = await supabase
                    .from("users")
                    .select("*")
                    .eq("id", Number(userId))
                    .single();

                if (error || !data) {
                    setLoadError("No se pudo cargar la información del usuario.");
                } else {
                    setName(data.name || "");
                    setAp(data.ap || "");
                    setAm(data.am || "");
                    setEmail(data.email || "");
                    setPhone(data.phone || "");
                    setSelectedDepId(data.dep_id);
                    setSelectedRolId(data.rol_id);
                }
            } catch {
                setLoadError("Error de conexión al cargar el usuario.");
            } finally {
                setIsLoadingUser(false);
            }
        };

        loadUser();
        fetchDepartments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const clearFieldError = (field: keyof FormErrors) => {
        setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const validate = (): boolean => {
        const errors: FormErrors = {};
        if (!name.trim()) errors.name = "El nombre es obligatorio.";
        if (!ap.trim()) errors.ap = "El apellido paterno es obligatorio.";
        if (!email.trim()) errors.email = "El correo electrónico es obligatorio.";
        else if (!EMAIL_REGEX.test(email.trim())) errors.email = "Correo electrónico no válido.";
        if (!phone.trim()) errors.phone = "El teléfono es obligatorio.";
        else if (!PHONE_REGEX.test(phone.trim())) errors.phone = "Debe tener exactamente 10 dígitos.";
        if (selectedDepId === undefined) errors.dep_id = "Selecciona un departamento.";
        if (selectedRolId === undefined) errors.rol_id = "Selecciona un rol.";

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        Keyboard.dismiss();
        clearMessages();
        if (!validate()) return;

        const ok = await updateUser({
            id: Number(userId),
            name: name.trim(),
            ap: ap.trim(),
            am: am.trim() || undefined,
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            dep_id: selectedDepId!,
            rol_id: selectedRolId!,
            old_dep_id: Number(oldDepId),
        });

        if (ok) {
            // Regresar al departamento después de 1.5s
            setTimeout(() => {
                router.back();
            }, 1500);
        }
    };

    const deptOptions = departments.map(d => ({ id: d.id, name: d.name }));

    return (
        <ScreenShell theme="light" scroll>
            <BackButton theme="light" label="Volver a residentes" onPress={() => router.back()} />

            <FormPageHeader
                theme="light"
                icon="person-outline"
                title="Editar residente"
                subtitle="Modifica los datos del usuario"
            />

            {isLoadingUser ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary.main} />
                    <Text style={styles.loadingText}>Cargando datos del usuario...</Text>
                </View>
            ) : loadError ? (
                <View style={styles.centered}>
                    <StatusBanner theme="light" type="error" message={loadError} />
                </View>
            ) : (
                <SectionCard theme="light">
                    {hookError && <StatusBanner theme="light" type="error" message={hookError} />}
                    {hookSuccess && <StatusBanner theme="light" type="success" message={hookSuccess} />}

                    <InputField
                        theme="light"
                        label="Nombre(s)"
                        placeholder="Ej. María"
                        leftIcon="person-outline"
                        value={name}
                        onChangeText={t => {
                            setName(t.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'\-]/g, ""));
                            clearFieldError("name");
                            clearMessages();
                        }}
                        error={fieldErrors.name}
                        maxLength={50}
                        autoCapitalize="words"
                    />

                    <InputField
                        theme="light"
                        label="Apellido paterno"
                        placeholder="Ej. García"
                        leftIcon="person-outline"
                        value={ap}
                        onChangeText={t => {
                            setAp(t.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'\-]/g, ""));
                            clearFieldError("ap");
                            clearMessages();
                        }}
                        error={fieldErrors.ap}
                        maxLength={50}
                        autoCapitalize="words"
                    />

                    <InputField
                        theme="light"
                        label="Apellido materno (opcional)"
                        placeholder="Ej. López"
                        leftIcon="person-outline"
                        value={am}
                        onChangeText={t => {
                            setAm(t.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'\-]/g, ""));
                            clearMessages();
                        }}
                        maxLength={50}
                        autoCapitalize="words"
                    />

                    <InputField
                        theme="light"
                        label="Correo electrónico"
                        placeholder="correo@ejemplo.com"
                        leftIcon="mail-outline"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={t => {
                            setEmail(t.replace(/[^a-zA-Z0-9.@_-]/g, ""));
                            clearFieldError("email");
                            clearMessages();
                        }}
                        error={fieldErrors.email}
                        maxLength={320}
                    />

                    <InputField
                        theme="light"
                        label="Teléfono (10 dígitos)"
                        placeholder="5512345678"
                        leftIcon="call-outline"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={t => {
                            setPhone(t.replace(/[^0-9]/g, "").slice(0, 10));
                            clearFieldError("phone");
                            clearMessages();
                        }}
                        error={fieldErrors.phone}
                        maxLength={10}
                    />

                    <PickerField
                        label="Rol del usuario"
                        placeholder="Selecciona el rol"
                        value={selectedRolId}
                        options={ROLES}
                        onSelect={(id) => {
                            setSelectedRolId(id);
                            clearFieldError("rol_id");
                            clearMessages();
                        }}
                        icon="shield-checkmark-outline"
                        error={fieldErrors.rol_id}
                    />

                    <PickerField
                        label="Departamento"
                        placeholder="Selecciona el departamento"
                        value={selectedDepId}
                        options={deptOptions}
                        onSelect={(id) => {
                            setSelectedDepId(id);
                            clearFieldError("dep_id");
                            clearMessages();
                        }}
                        icon="business-outline"
                        error={fieldErrors.dep_id}
                    />

                    <PrimaryButton
                        label="Guardar cambios"
                        onPress={handleSubmit}
                        isLoading={hookIsLoading}
                        disabled={hookIsLoading || hookIsLoading}
                    />
                </SectionCard>
            )}
        </ScreenShell>
    );
}

const pickStyles = StyleSheet.create({
    container: { marginBottom: 18 },
    label: { fontFamily: "Outfit_700Bold", fontSize: 11, color: Colors.screen.textSecondary, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
    trigger: {
        flexDirection: "row", alignItems: "center", height: 52, borderRadius: 12,
        paddingHorizontal: 14, borderWidth: 1.5, borderColor: Colors.screen.border,
        backgroundColor: Colors.screen.card,
    },
    triggerError: { borderColor: Colors.status.error },
    triggerDisabled: { opacity: 0.5 },
    triggerText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 15, color: Colors.screen.textPrimary },
    placeholder: { color: Colors.screen.textMuted },
    errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.status.error },
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
    sheet: {
        backgroundColor: Colors.screen.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingBottom: 32, maxHeight: "70%",
        borderTopWidth: 1, borderTopColor: Colors.screen.border,
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.screen.border, alignSelf: "center", marginTop: 12, marginBottom: 8 },
    sheetTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.screen.textPrimary, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.screen.border },
    option: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: Colors.screen.border },
    optionActive: { backgroundColor: Colors.screen.chipBlue },
    optionText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.screen.textSecondary },
    optionTextActive: { fontFamily: "Outfit_600SemiBold", color: Colors.primary.main },
    cancelBtn: { marginHorizontal: 20, marginTop: 12, paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.screen.bg, alignItems: "center", borderWidth: 1, borderColor: Colors.screen.border },
    cancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
});

const styles = StyleSheet.create({
    centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 12 },
    loadingText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted },
});
