import PrimaryButton from "@/components/PrimaryButton";
import {
    BackButton,
    ScreenShell,
    SectionCard,
    StatusBanner,
} from "@/components/ui";
import { Colors } from "@/constants/colors";
import {
    useTickets,
    type SupportArea,
    type SupportErrorType,
} from "@/hooks/useTickets";
import { uploadSupportEvidence } from "@/lib/cloudinarySupport";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const MAX_DESCRIPTION_LENGTH = 250;

// ── Selector de opciones (modal bottom-sheet style) ───────────────────────────

interface OptionPickerProps {
  visible: boolean;
  title: string;
  options: { id: number; name: string }[];
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
  onClose: () => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

function OptionPicker({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
  isLoading,
  emptyMessage,
}: OptionPickerProps) {
  const translateY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 180,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 300,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalBackdrop, { opacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[styles.modalSheet, { transform: [{ translateY }] }]}
      >
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {/* Title */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.sheetCloseBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close"
              size={18}
              color={Colors.screen.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.sheetLoading}>
            <ActivityIndicator size="small" color={Colors.primary.main} />
            <Text style={styles.sheetLoadingText}>Cargando opciones...</Text>
          </View>
        ) : options.length === 0 ? (
          <View style={styles.sheetEmpty}>
            <Ionicons
              name="file-tray-outline"
              size={28}
              color={Colors.screen.textMuted}
            />
            <Text style={styles.sheetEmptyText}>
              {emptyMessage ?? "Sin opciones disponibles"}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.sheetList}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {options.map((opt) => {
              const isSelected = selectedId === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.sheetOption,
                    isSelected && styles.sheetOptionSelected,
                  ]}
                  onPress={() => {
                    onSelect(opt.id, opt.name);
                    onClose();
                  }}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.sheetOptionDot,
                      {
                        backgroundColor: isSelected
                          ? Colors.primary.main
                          : Colors.neutral[200],
                      },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.sheetOptionText,
                      isSelected && styles.sheetOptionTextSelected,
                    ]}
                  >
                    {opt.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

// ── Selector de campo (trigger) ───────────────────────────────────────────────

interface SelectFieldProps {
  label: string;
  placeholder: string;
  value: string | null;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  error?: string;
}

function SelectField({
  label,
  placeholder,
  value,
  onPress,
  icon,
  disabled,
  error,
}: SelectFieldProps) {
  return (
    <View style={styles.selectContainer}>
      <Text style={styles.selectLabel}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.selectTrigger,
          !!value && styles.selectTriggerFilled,
          disabled && styles.selectTriggerDisabled,
          !!error && styles.selectTriggerError,
        ]}
        onPress={disabled ? undefined : onPress}
        activeOpacity={disabled ? 1 : 0.75}
      >
        <Ionicons
          name={icon}
          size={18}
          color={value ? Colors.primary.main : Colors.screen.iconMuted}
          style={{ marginRight: 10 }}
        />
        <Text
          style={[
            styles.selectText,
            !value && styles.selectPlaceholder,
            disabled && styles.selectDisabledText,
          ]}
        >
          {value ?? placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={disabled ? Colors.neutral[300] : Colors.screen.textMuted}
        />
      </TouchableOpacity>
      {error && (
        <View style={styles.fieldError}>
          <Ionicons
            name="alert-circle-outline"
            size={12}
            color={Colors.status.error}
          />
          <Text style={styles.fieldErrorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ── Badge de evidencia adjunta ────────────────────────────────────────────────

interface EvidenceBadgeProps {
  uri: string;
  filename: string;
  onRemove: () => void;
}

function EvidenceBadge({ uri, filename, onRemove }: EvidenceBadgeProps) {
  return (
    <View style={styles.evidenceBadge}>
      <Image source={{ uri }} style={styles.evidenceThumb} resizeMode="cover" />
      <View style={styles.evidenceInfo}>
        <Text style={styles.evidenceName} numberOfLines={1}>
          {filename}
        </Text>
        <Text style={styles.evidenceType}>Imagen · lista para enviar</Text>
      </View>
      <TouchableOpacity
        style={styles.evidenceRemove}
        onPress={onRemove}
        activeOpacity={0.75}
      >
        <Ionicons
          name="close-circle"
          size={22}
          color={Colors.screen.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function ReportErrorScreen() {
  const {
    areas,
    errorTypes,
    isLoading,
    isSubmitting,
    error: apiError,
    success,
    fetchAreas,
    fetchErrorTypesByArea,
    submitTicket,
    clearMessages,
  } = useTickets();

  // Form state
  const [selectedArea, setSelectedArea] = useState<SupportArea | null>(null);
  const [selectedErrorType, setSelectedErrorType] =
    useState<SupportErrorType | null>(null);
  const [description, setDescription] = useState("");
  const [evidenceUri, setEvidenceUri] = useState<string | null>(null);
  const [evidenceFilename, setEvidenceFilename] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // Picker visibility
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [showErrorTypePicker, setShowErrorTypePicker] = useState(false);

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    area?: string;
    errorType?: string;
    description?: string;
  }>({});

  // Success animation
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    fetchAreas();
  }, []);

  useEffect(() => {
    if (success) {
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [success]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAreaSelect = (id: number, name: string) => {
    const area = areas.find((a) => a.id === id) ?? null;
    setSelectedArea(area);
    setSelectedErrorType(null);
    setFieldErrors((p) => ({ ...p, area: undefined }));
    fetchErrorTypesByArea(id);
  };

  const handleErrorTypeSelect = (id: number, name: string) => {
    const et = errorTypes.find((e) => e.id === id) ?? null;
    setSelectedErrorType(et);
    setFieldErrors((p) => ({ ...p, errorType: undefined }));
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso requerido",
        "Necesitamos acceso a tu galería para adjuntar evidencia.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setEvidenceUri(asset.uri);
      setEvidenceFilename(asset.fileName ?? `imagen_${Date.now()}.jpg`);
    }
  };

  const handleRemoveEvidence = () => {
    setEvidenceUri(null);
    setEvidenceFilename("");
  };

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (!selectedArea) errors.area = "Selecciona un área.";
    if (!selectedErrorType)
      errors.errorType = "Selecciona el tipo de problema.";
    if (!description.trim()) errors.description = "Describe el problema.";
    else if (description.trim().length < 10)
      errors.description = "Mínimo 10 caracteres.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    clearMessages();
    if (!validate()) return;

    let evidenceUrl: string | null = null;

    // Subir evidencia si existe
    if (evidenceUri) {
      setIsUploading(true);
      try {
        const result = await uploadSupportEvidence(evidenceUri);
        evidenceUrl = result.url;
      } catch (e: any) {
        Alert.alert(
          "Error al subir evidencia",
          e?.message ?? "Intenta de nuevo.",
        );
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    await submitTicket({
      area_id: selectedArea!.id,
      error_type_id: selectedErrorType!.id,
      description: description.trim(),
      evidence_url: evidenceUrl,
    });
  };

  // ── Success screen ────────────────────────────────────────────────────────

  if (success) {
    return (
      <ScreenShell theme="light">
        <Animated.View
          style={[styles.successContainer, { opacity: successOpacity }]}
        >
          <Animated.View
            style={[
              styles.successCard,
              { transform: [{ scale: successScale }] },
            ]}
          >
            <View style={styles.successIconWrap}>
              <Ionicons
                name="checkmark-circle"
                size={52}
                color={Colors.status.success}
              />
            </View>
            <Text style={styles.successTitle}>¡Reporte enviado!</Text>
            <Text style={styles.successText}>
              Tu reporte fue recibido correctamente. Nuestro equipo lo revisará
              a la brevedad.
            </Text>
            <View style={styles.successDivider} />
            <View style={styles.successInfo}>
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color={Colors.primary.dark}
              />
              <Text style={styles.successInfoText}>
                ADI Soporte · equipo interno
              </Text>
            </View>
          </Animated.View>

          <PrimaryButton
            label="Volver a Ayuda"
            onPress={() => router.back()}
            style={{ marginHorizontal: 24 }}
          />
        </Animated.View>
      </ScreenShell>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  const isWorking = isSubmitting || isUploading;

  return (
    <ScreenShell theme="light">
      {/* Header manual (sin ScreenHeader para tener back inline) */}
      <View style={styles.header}>
        <BackButton theme="light" label="Ayuda" onPress={() => router.back()} />
        <View style={styles.headerTitle}>
          <View style={styles.headerIconWrap}>
            <Ionicons
              name="bug-outline"
              size={17}
              color={Colors.status.error}
            />
          </View>
          <Text style={styles.headerText}>Reportar problema</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner de error */}
        {apiError && (
          <StatusBanner theme="light" type="error" message={apiError} />
        )}

        {/* Intro */}
        <View style={styles.introBanner}>
          <Ionicons
            name="information-circle-outline"
            size={17}
            color={Colors.primary.dark}
          />
          <Text style={styles.introText}>
            Cuéntanos qué está fallando y lo resolveremos lo antes posible. La
            evidencia es opcional pero ayuda a entender el problema.
          </Text>
        </View>

        {/* Card principal */}
        <SectionCard theme="light" padding={18} paddingTop={18}>
          {/* Área */}
          <SelectField
            label="ÁREA"
            placeholder="Selecciona el área con el problema"
            value={selectedArea?.name ?? null}
            icon="location-outline"
            onPress={() => setShowAreaPicker(true)}
            error={fieldErrors.area}
          />

          {/* Tipo de error */}
          <SelectField
            label="TIPO DE PROBLEMA"
            placeholder={
              !selectedArea
                ? "Primero selecciona un área"
                : isLoading
                  ? "Cargando tipos..."
                  : errorTypes.length === 0
                    ? "Sin tipos disponibles para esta área"
                    : "Selecciona el tipo de problema"
            }
            value={selectedErrorType?.name ?? null}
            icon="alert-circle-outline"
            onPress={() => setShowErrorTypePicker(true)}
            disabled={!selectedArea || isLoading || errorTypes.length === 0}
            error={fieldErrors.errorType}
          />

          {/* Descripción */}
          <View style={styles.descContainer}>
            <Text style={styles.descLabel}>DESCRIPCIÓN</Text>
            <View
              style={[
                styles.descInput,
                !!fieldErrors.description && styles.descInputError,
              ]}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={Colors.screen.iconMuted}
                style={styles.descIcon}
              />
              <View style={styles.descRight}>
                <TextInput
                  style={[
                    styles.descInputField,
                    { color: Colors.screen.textPrimary },
                  ]}
                  placeholderTextColor={Colors.screen.textMuted}
                  value={description}
                  onChangeText={(t) => {
                    setDescription(t);
                    if (fieldErrors.description)
                      setFieldErrors((p) => ({ ...p, description: undefined }));
                  }}
                  placeholder="Describe el problema con detalle (qué pasó, cuándo, en qué pantalla...)"
                  multiline
                  numberOfLines={4}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                />
                <Text
                  style={[
                    styles.charCount,
                    description.length >= MAX_DESCRIPTION_LENGTH &&
                      styles.charCountMax,
                  ]}
                >
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </Text>
              </View>
            </View>
            {fieldErrors.description && (
              <View style={styles.fieldError}>
                <Ionicons
                  name="alert-circle-outline"
                  size={12}
                  color={Colors.status.error}
                />
                <Text style={styles.fieldErrorText}>
                  {fieldErrors.description}
                </Text>
              </View>
            )}
          </View>
        </SectionCard>

        {/* Evidencia */}
        <SectionCard theme="light" padding={18} paddingTop={18}>
          <Text style={styles.evidenceLabel}>EVIDENCIA (OPCIONAL)</Text>

          {evidenceUri ? (
            <EvidenceBadge
              uri={evidenceUri}
              filename={evidenceFilename}
              onRemove={handleRemoveEvidence}
            />
          ) : (
            <TouchableOpacity
              style={styles.evidencePickBtn}
              onPress={handlePickImage}
              activeOpacity={0.75}
            >
              <View style={styles.evidenceBtnIcon}>
                <Ionicons
                  name="image-outline"
                  size={24}
                  color={Colors.primary.main}
                />
              </View>
              <View style={styles.evidencePickTexts}>
                <Text style={styles.evidenceBtnText}>Adjuntar imagen</Text>
                <Text style={styles.evidenceBtnSub}>
                  JPG o PNG desde tu galería
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.screen.textMuted}
              />
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* Submit */}
        <PrimaryButton
          label={
            isUploading
              ? "Subiendo evidencia..."
              : isSubmitting
                ? "Enviando reporte..."
                : "Enviar reporte"
          }
          onPress={handleSubmit}
          isLoading={isWorking}
          disabled={isWorking}
        />

        <Text style={styles.footerNote}>
          Al enviar, el equipo de soporte de ADI recibirá tu reporte con tu ID
          de usuario.
        </Text>
      </ScrollView>

      {/* Modales */}
      <OptionPicker
        visible={showAreaPicker}
        title="Seleccionar área"
        options={areas}
        selectedId={selectedArea?.id ?? null}
        onSelect={handleAreaSelect}
        onClose={() => setShowAreaPicker(false)}
        isLoading={isLoading && areas.length === 0}
        emptyMessage="No hay áreas registradas."
      />

      <OptionPicker
        visible={showErrorTypePicker}
        title="Tipo de problema"
        options={errorTypes}
        selectedId={selectedErrorType?.id ?? null}
        onSelect={handleErrorTypeSelect}
        onClose={() => setShowErrorTypePicker(false)}
        emptyMessage="No hay tipos para esta área."
      />
    </ScreenShell>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.screen.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.screen.border,
  },
  headerTitle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.status.errorBg,
    borderWidth: 1,
    borderColor: Colors.status.errorBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.screen.textPrimary,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // Intro
  introBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.primary.soft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.muted,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  introText: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.primary.dark,
    lineHeight: 19,
  },

  // Select field
  selectContainer: {
    marginBottom: 16,
  },
  selectLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: Colors.screen.textSecondary,
    marginBottom: 8,
  },
  selectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.screen.border,
    backgroundColor: Colors.screen.card,
  },
  selectTriggerFilled: {
    borderColor: Colors.primary.muted,
    backgroundColor: Colors.primary.soft,
  },
  selectTriggerDisabled: {
    backgroundColor: Colors.neutral[100],
    borderColor: Colors.neutral[200],
  },
  selectTriggerError: {
    borderColor: Colors.status.errorBorder,
  },
  selectText: {
    flex: 1,
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.screen.textPrimary,
  },
  selectPlaceholder: {
    color: Colors.screen.textMuted,
    fontFamily: "Outfit_400Regular",
  },
  selectDisabledText: {
    color: Colors.neutral[300],
  },
  fieldError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  fieldErrorText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: Colors.status.error,
  },

  // Descripción
  descContainer: {
    marginBottom: 4,
  },
  descLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: Colors.screen.textSecondary,
    marginBottom: 8,
  },
  descInput: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.screen.border,
    backgroundColor: Colors.screen.card,
    padding: 10,
    gap: 8,
  },
  descInputError: {
    borderColor: Colors.status.errorBorder,
  },
  descIcon: {
    marginTop: 2,
  },
  descRight: {
    flex: 1,
  },
  descInputField: {
    flex: 1,
    minHeight: 96,
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    textAlignVertical: "top",
    paddingTop: 4,
    paddingRight: 0,
    paddingLeft: 0,
    paddingBottom: 0,
  },
  descField: {
    flex: 1,
  },
  charCount: {
    fontFamily: "Outfit_400Regular",
    fontSize: 10,
    color: Colors.screen.textMuted,
    textAlign: "right",
    marginTop: -8,
  },
  charCountMax: {
    color: Colors.status.error,
  },

  // Evidencia
  evidenceLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: Colors.screen.textSecondary,
    marginBottom: 12,
  },
  evidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: Colors.primary.soft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.muted,
    marginBottom: 12,
  },
  evidenceThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    flexShrink: 0,
  },
  evidenceInfo: {
    flex: 1,
    gap: 3,
  },
  evidenceName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.screen.textPrimary,
  },
  evidenceType: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.primary.dark,
  },
  evidenceRemove: {
    padding: 4,
    flexShrink: 0,
  },
  evidencePickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.screen.border,
    borderStyle: "dashed",
    marginBottom: 12,
  },
  evidenceBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary.soft,
    borderWidth: 1,
    borderColor: Colors.primary.muted,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  evidencePickTexts: {
    flex: 1,
    gap: 2,
  },
  evidenceBtnText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.screen.textPrimary,
  },
  evidenceBtnSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.screen.textMuted,
  },
  evidenceNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  evidenceNoteText: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.screen.textMuted,
    lineHeight: 16,
  },

  // Footer note
  footerNote: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.screen.textMuted,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 8,
  },

  // Modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.screen.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral[300],
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.screen.border,
  },
  sheetTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.screen.textPrimary,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  sheetLoading: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 36,
  },
  sheetLoadingText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.screen.textMuted,
  },
  sheetEmpty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 36,
  },
  sheetEmptyText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.screen.textMuted,
  },
  sheetList: {
    paddingTop: 6,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.screen.border,
  },
  sheetOptionSelected: {
    backgroundColor: Colors.primary.soft,
  },
  sheetOptionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sheetOptionText: {
    flex: 1,
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.screen.textPrimary,
  },
  sheetOptionTextSelected: {
    fontFamily: "Outfit_600SemiBold",
    color: Colors.primary.dark,
  },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 24,
    padding: 24,
  },
  successCard: {
    backgroundColor: Colors.screen.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.screen.border,
    padding: 28,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.status.successBg,
    borderWidth: 1.5,
    borderColor: Colors.status.successBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 22,
    color: Colors.screen.textPrimary,
    textAlign: "center",
  },
  successText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.screen.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
  successDivider: {
    height: 1,
    backgroundColor: Colors.screen.border,
    alignSelf: "stretch",
    marginVertical: 4,
  },
  successInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  successInfoText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: Colors.primary.dark,
  },
});
