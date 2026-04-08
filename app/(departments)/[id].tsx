import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";
import { BackButton, ScreenShell, StatusBanner } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useDepartments, type DeptUser } from "@/hooks/useDepartments";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ── Validaciones ──────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;

interface FormErrors {
    name?: string; ap?: string;
    email?: string; phone?: string; password?: string;
}

function validateForm(f: {
    name: string; ap: string; email: string; phone: string; password: string;
}): FormErrors {
    const errors: FormErrors = {};
    if (!f.name.trim()) errors.name = "El nombre es obligatorio.";
    if (!f.ap.trim()) errors.ap = "El apellido paterno es obligatorio.";
    if (!f.email.trim()) errors.email = "El correo es obligatorio.";
    else if (!EMAIL_REGEX.test(f.email.trim())) errors.email = "Correo no válido.";
    if (!f.phone.trim()) errors.phone = "El teléfono es obligatorio.";
    else if (!PHONE_REGEX.test(f.phone.trim())) errors.phone = "Debe tener exactamente 10 dígitos.";
    if (!f.password.trim()) errors.password = "La contraseña es obligatoria.";
    else if (f.password.length < 8) errors.password = "Mínimo 8 caracteres.";
    return errors;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRolLabel(rolId: number): string {
    switch (rolId) {
        case 1: return "Residente";
        case 2: return "Tesorero";
        case 3: return "Administrador";
        case 4: return "Tesorero y Admin";
        default: return "Usuario";
    }
}

function getRolColor(rolId: number): { color: string; bg: string; border: string } {
    switch (rolId) {
        case 2: return { color: Colors.secondary.main, bg: Colors.secondary.soft, border: "#FED7AA" };
        case 3: return { color: Colors.primary.dark, bg: Colors.primary.soft, border: Colors.primary.muted };
        case 4: return { color: "#6D28D9", bg: "#F5F3FF", border: "#DDD6FE" };
        default: return { color: Colors.screen.textMuted, bg: Colors.neutral[100], border: Colors.screen.border };
    }
}

// ── Tarjeta de usuario ────────────────────────────────────────────────────────

function UserCard({ user, onDelete }: { user: DeptUser; onDelete: (u: DeptUser) => void }) {
    const initials = `${user.name[0] ?? ""}${user.ap[0] ?? ""}`.toUpperCase();
    const rolColor = getRolColor(user.rol_id);

    return (
        <View style={cardStyles.card}>
            <View style={[cardStyles.avatar, { backgroundColor: rolColor.bg, borderColor: rolColor.border }]}>
                <Text style={[cardStyles.avatarText, { color: rolColor.color }]}>{initials}</Text>
            </View>
            <View style={cardStyles.info}>
                <Text style={cardStyles.userName} numberOfLines={1}>
                    {user.name} {user.ap}{user.am ? ` ${user.am}` : ""}
                </Text>
                {/* Rol badge */}
                <View style={[cardStyles.rolPill, { backgroundColor: rolColor.bg, borderColor: rolColor.border }]}>
                    <Text style={[cardStyles.rolText, { color: rolColor.color }]}>
                        {getRolLabel(user.rol_id)}
                    </Text>
                </View>
                <View style={cardStyles.metaRow}>
                    <Ionicons name="mail-outline" size={11} color={Colors.screen.textMuted} />
                    <Text style={cardStyles.metaText} numberOfLines={1}>{user.email}</Text>
                </View>
                <View style={cardStyles.metaRow}>
                    <Ionicons name="call-outline" size={11} color={Colors.screen.textMuted} />
                    <Text style={cardStyles.metaText}>{user.phone || "—"}</Text>
                </View>
            </View>
            <TouchableOpacity style={cardStyles.deleteBtn} onPress={() => onDelete(user)} activeOpacity={0.75}>
                <Ionicons name="trash-outline" size={16} color={Colors.status.error} />
            </TouchableOpacity>
        </View>
    );
}

// ── Modal: Crear residente ────────────────────────────────────────────────────

interface CreateModalProps {
    visible: boolean;
    depId: number;
    onClose: () => void;
    onSuccess: () => void;
    createUser: (payload: any) => Promise<boolean>;
    isLoading: boolean;
    error: string | null;
    success: string | null;
    clearMessages: () => void;
}

function CreateUserModal({
    visible, depId, onClose, onSuccess,
    createUser, isLoading, error, success, clearMessages,
}: CreateModalProps) {
    const [name, setName] = useState("");
    const [ap, setAp] = useState("");
    const [am, setAm] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

    const slideAnim = useRef(new Animated.Value(700)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0, useNativeDriver: true, damping: 20, stiffness: 160,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 700, duration: 220, useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const resetForm = () => {
        setName(""); setAp(""); setAm(""); setEmail("");
        setPhone(""); setPassword(""); setFieldErrors({});
        clearMessages();
    };

    const handleClose = () => { resetForm(); onClose(); };

    const clearFieldError = (field: keyof FormErrors) =>
        setFieldErrors(prev => ({ ...prev, [field]: undefined }));

    const handleSubmit = async () => {
        Keyboard.dismiss();
        const errors = validateForm({ name, ap, email, phone, password });
        setFieldErrors(errors);
        if (Object.values(errors).some(Boolean)) return;

        const ok = await createUser({
            name: name.trim(), ap: ap.trim(), am: am.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(), password: password.trim(),
            dep_id: depId, rol_id: 1,
        });

        if (ok) { resetForm(); onSuccess(); }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={modalStyles.overlay}>
                <TouchableOpacity style={modalStyles.backdrop} onPress={handleClose} activeOpacity={1} />

                <Animated.View style={[modalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={modalStyles.handle} />

                    {/* Header */}
                    <View style={modalStyles.sheetHeader}>
                        <View style={modalStyles.sheetIconWrap}>
                            <Ionicons name="person-add-outline" size={22} color={Colors.primary.main} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={modalStyles.sheetTitle}>Nuevo residente</Text>
                            <Text style={modalStyles.sheetSubtitle}>Rol: Residente · Depto. asignado</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={modalStyles.closeBtn}>
                            <Ionicons name="close" size={20} color={Colors.screen.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={modalStyles.formScroll}
                    >
                        {error && <StatusBanner theme="light" type="error" message={error} />}
                        {success && <StatusBanner theme="light" type="success" message={success} />}

                        <InputField
                            theme="light" label="Nombre(s)" placeholder="Ej. María"
                            leftIcon="person-outline" value={name}
                            onChangeText={t => { setName(t); clearFieldError("name"); }}
                            error={fieldErrors.name} maxLength={50} autoCapitalize="words"
                        />

                        <View style={modalStyles.rowInputs}>
                            <View style={{ flex: 1 }}>
                                <InputField
                                    theme="light" label="Ap. Paterno" placeholder="Pérez"
                                    leftIcon="person-outline" value={ap}
                                    onChangeText={t => { setAp(t); clearFieldError("ap"); }}
                                    error={fieldErrors.ap} maxLength={40} autoCapitalize="words"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <InputField
                                    theme="light" label="Ap. Materno" placeholder="López (opc.)"
                                    leftIcon="person-outline" value={am}
                                    onChangeText={setAm} maxLength={40} autoCapitalize="words"
                                />
                            </View>
                        </View>

                        <InputField
                            theme="light" label="Correo electrónico" placeholder="correo@ejemplo.com"
                            leftIcon="mail-outline" keyboardType="email-address" autoCapitalize="none"
                            value={email}
                            onChangeText={t => {
                                setEmail(t.replace(/[^a-zA-Z0-9.@]/g, ""));
                                clearFieldError("email");
                            }}
                            error={fieldErrors.email} maxLength={320}
                        />

                        <InputField
                            theme="light" label="Teléfono (10 dígitos)" placeholder="5512345678"
                            leftIcon="call-outline" keyboardType="phone-pad"
                            value={phone}
                            onChangeText={t => {
                                setPhone(t.replace(/[^0-9]/g, "").slice(0, 10));
                                clearFieldError("phone");
                            }}
                            error={fieldErrors.phone} maxLength={10}
                        />

                        <InputField
                            theme="light" label="Contraseña" placeholder="Mínimo 8 caracteres"
                            leftIcon="lock-closed-outline" isPassword value={password}
                            onChangeText={t => {
                                setPassword(t.replace(/\s/g, ""));
                                clearFieldError("password");
                            }}
                            error={fieldErrors.password} maxLength={32}
                        />

                        <PrimaryButton
                            label="Crear residente"
                            onPress={handleSubmit}
                            isLoading={isLoading}
                            disabled={isLoading}
                        />

                        <View style={{ height: Platform.OS === "ios" ? 20 : 8 }} />
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ── Pantalla detalle ──────────────────────────────────────────────────────────

export default function DeptDetailScreen() {
    const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
    const depId = Number(id);
    const deptName = decodeURIComponent(name ?? "");

    const {
        users, isLoading, error, success,
        clearMessages, fetchUsersByDept, createUser, deleteUser,
    } = useDepartments();

    const [modalVisible, setModalVisible] = useState(false);
    const [banner, setBanner] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

    useEffect(() => { fetchUsersByDept(depId); }, [depId]);

    const showBanner = (type: "success" | "error" | "info", text: string) => {
        setBanner({ type, text });
        setTimeout(() => setBanner(null), 3500);
    };

    // Al crear el primer residente, el depto se puede activar desde el index.
    // Aquí solo recargamos la lista y mostramos éxito.
    const handleSuccess = useCallback(() => {
        setModalVisible(false);
        fetchUsersByDept(depId);
        showBanner("success", "Usuario creado correctamente.");
    }, [depId]);

    const handleDelete = useCallback((user: DeptUser) => {
        const isLast = users.length === 1;
        const warningMsg = isLast
            ? `¿Eliminar a ${user.name} ${user.ap}? Es el único usuario del depto. El departamento se marcará como desocupado automáticamente.`
            : `¿Eliminar a ${user.name} ${user.ap}? Esta acción no se puede deshacer.`;

        Alert.alert("Eliminar usuario", warningMsg, [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: async () => {
                    const ok = await deleteUser(user.id, depId);
                    if (ok) {
                        const msg = isLast
                            ? "Usuario eliminado. El departamento fue marcado como desocupado."
                            : "Usuario eliminado.";
                        showBanner("success", msg);
                    } else {
                        showBanner("error", "Error al eliminar el usuario.");
                    }
                },
            },
        ]);
    }, [users, deleteUser, depId]);

    return (
        <ScreenShell theme="light">
            {/* Top bar */}
            <View style={styles.topBar}>
                <BackButton
                    theme="light"
                    label="Departamentos"
                    onPress={() => router.back()}
                />
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => { clearMessages(); setModalVisible(true); }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="person-add-outline" size={16} color={Colors.white} />
                    <Text style={styles.addBtnText}>Agregar</Text>
                </TouchableOpacity>
            </View>

            {/* Header del depto */}
            <View style={styles.deptHeader}>
                <View style={styles.deptIconLarge}>
                    <Ionicons name="home" size={28} color={Colors.primary.main} />
                </View>
                <Text style={styles.deptTitle}>{deptName}</Text>
                <Text style={styles.deptSubtitle}>Residentes registrados</Text>
            </View>

            {/* Banner de estado */}
            {banner && (
                <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
                    <StatusBanner theme="light" type={banner.type} message={banner.text} />
                </View>
            )}

            {/* Lista */}
            {isLoading && users.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary.main} />
                    <Text style={styles.loadingText}>Cargando residentes...</Text>
                </View>
            ) : users.length === 0 ? (
                <View style={styles.centered}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="people-outline" size={36} color={Colors.screen.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>Sin residentes</Text>
                    <Text style={styles.emptyText}>
                        Este departamento no tiene residentes. Agrega uno para poder activarlo.
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyAddBtn}
                        onPress={() => { clearMessages(); setModalVisible(true); }}
                    >
                        <Ionicons name="person-add-outline" size={16} color={Colors.primary.main} />
                        <Text style={styles.emptyAddText}>Agregar primer residente</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={u => String(u.id)}
                    renderItem={({ item }) => (
                        <UserCard user={item} onDelete={handleDelete} />
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            <View style={styles.countBadge}>
                                <Ionicons name="people-outline" size={13} color={Colors.primary.dark} />
                                <Text style={styles.countText}>
                                    {users.length} {users.length === 1 ? "residente" : "residentes"}
                                </Text>
                            </View>
                        </View>
                    }
                />
            )}

            {/* Modal crear */}
            <CreateUserModal
                visible={modalVisible}
                depId={depId}
                onClose={() => setModalVisible(false)}
                onSuccess={handleSuccess}
                createUser={createUser}
                isLoading={isLoading}
                error={error}
                success={success}
                clearMessages={clearMessages}
            />
        </ScreenShell>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: Colors.screen.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        padding: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    avatar: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: Colors.primary.soft,
        borderWidth: 1.5, borderColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    avatarText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.primary.dark, letterSpacing: 0.5 },
    info: { flex: 1, gap: 4 },
    userName: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textPrimary, lineHeight: 18 },
    rolPill: { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    rolText: { fontFamily: "Outfit_600SemiBold", fontSize: 10, letterSpacing: 0.3 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, flex: 1 },
    deleteBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: Colors.status.errorBg,
        borderWidth: 1, borderColor: Colors.status.errorBorder,
        alignItems: "center", justifyContent: "center",
    },
});

const modalStyles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end" },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: {
        backgroundColor: Colors.screen.bg,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: "92%", paddingTop: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12, shadowRadius: 24, elevation: 20,
    },
    handle: {
        width: 38, height: 4, borderRadius: 2,
        backgroundColor: Colors.neutral[300],
        alignSelf: "center", marginBottom: 12,
    },
    sheetHeader: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    sheetIconWrap: {
        width: 42, height: 42, borderRadius: 13,
        backgroundColor: Colors.primary.soft,
        borderWidth: 1, borderColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center",
    },
    sheetTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, color: Colors.screen.textPrimary },
    sheetSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    closeBtn: {
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: Colors.neutral[100],
        alignItems: "center", justifyContent: "center",
    },
    formScroll: { paddingHorizontal: 20, paddingTop: 20 },
    rowInputs: { flexDirection: "row", gap: 10 },
});

const styles = StyleSheet.create({
    topBar: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    },
    addBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
        backgroundColor: Colors.primary.main,
        shadowColor: Colors.primary.dark,
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
    },
    addBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.white },

    deptHeader: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 16, gap: 8 },
    deptIconLarge: {
        width: 68, height: 68, borderRadius: 20,
        backgroundColor: Colors.primary.soft,
        borderWidth: 2, borderColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center",
        shadowColor: Colors.primary.dark,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
    },
    deptTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 24, color: Colors.screen.textPrimary, letterSpacing: 0.3 },
    deptSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted },

    listHeader: { marginBottom: 10 },
    countBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        alignSelf: "flex-start",
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, backgroundColor: Colors.primary.soft,
        borderWidth: 1, borderColor: Colors.primary.muted,
    },
    countText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.primary.dark },

    list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },

    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
    loadingText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted },
    emptyIcon: {
        width: 72, height: 72, borderRadius: 22,
        backgroundColor: Colors.neutral[100],
        borderWidth: 1, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center",
    },
    emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 17, color: Colors.screen.textSecondary },
    emptyText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted, textAlign: "center", lineHeight: 20 },
    emptyAddBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        marginTop: 4, paddingHorizontal: 18, paddingVertical: 10,
        borderRadius: 20, backgroundColor: Colors.primary.soft,
        borderWidth: 1, borderColor: Colors.primary.muted,
    },
    emptyAddText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },
});