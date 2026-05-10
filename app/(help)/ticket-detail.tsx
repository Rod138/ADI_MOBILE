import { BackButton, ScreenShell } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useMyTickets } from "@/hooks/useMyTickets";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusConfig(statusId: number) {
  switch (statusId) {
    case 1:
      return {
        label: "Pendiente",
        color: Colors.status.warning,
        bg: Colors.status.warningBg,
        border: Colors.status.warningBorder,
        icon: "time-outline" as const,
        description: "Tu reporte está en espera de ser atendido.",
      };
    case 2:
      return {
        label: "En revisión",
        color: Colors.status.info,
        bg: Colors.status.infoBg,
        border: Colors.status.infoBorder,
        icon: "search-outline" as const,
        description: "El equipo de soporte está revisando tu caso.",
      };
    case 3:
      return {
        label: "Resuelto",
        color: Colors.status.success,
        bg: Colors.status.successBg,
        border: Colors.status.successBorder,
        icon: "checkmark-circle-outline" as const,
        description: "Tu reporte fue resuelto satisfactoriamente.",
      };
    case 4:
      return {
        label: "Cerrado",
        color: Colors.neutral[500],
        bg: Colors.neutral[100],
        border: Colors.neutral[200],
        icon: "lock-closed-outline" as const,
        description: "Este reporte ha sido cerrado.",
      };
    default:
      return {
        label: "Desconocido",
        color: Colors.neutral[400],
        bg: Colors.neutral[100],
        border: Colors.neutral[200],
        icon: "help-outline" as const,
        description: "",
      };
  }
}

function getPriorityConfig(priorityId: number) {
  switch (priorityId) {
    case 1:
      return { color: Colors.status.error, label: "Alta", dot: "#DC2626" };
    case 2:
      return { color: Colors.status.warning, label: "Media", dot: "#D97706" };
    case 3:
      return { color: Colors.status.success, label: "Baja", dot: "#16A34A" };
    default:
      return { color: Colors.neutral[400], label: "N/A", dot: "#A3A3A3" };
  }
}

function formatDatetime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSla(iso: string | null): string {
  if (!iso) return "Sin fecha límite";
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const hoursLeft = Math.floor(diff / (1000 * 60 * 60));

  if (hoursLeft < 0) return `Vencido · ${d.toLocaleDateString("es-MX")}`;
  if (hoursLeft < 24) return `Vence hoy · ${hoursLeft}h restantes`;
  const daysLeft = Math.floor(hoursLeft / 24);
  return `Vence en ${daysLeft} día${daysLeft > 1 ? "s" : ""} · ${d.toLocaleDateString("es-MX")}`;
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={14} color={Colors.screen.textMuted} />
      </View>
      <View style={styles.infoTexts}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
          style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function DetailCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.detailCard}>
      <View style={styles.detailCardHeader}>
        <Ionicons name={icon} size={14} color={Colors.primary.main} />
        <Text style={styles.detailCardTitle}>{title}</Text>
      </View>
      <View style={styles.detailCardBody}>{children}</View>
    </View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const Line = ({
    w,
    h = 12,
    mt = 0,
  }: {
    w: string | number;
    h?: number;
    mt?: number;
  }) => (
    <Animated.View
      style={[
        {
          width: w as any,
          height: h,
          borderRadius: 6,
          backgroundColor: Colors.neutral[200],
          marginTop: mt,
          opacity,
        },
      ]}
    />
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.statusHeroBig, { opacity }]}>
        <View style={styles.skeletonIcon} />
        <Line w="50%" h={18} />
        <Line w="80%" h={13} mt={6} />
      </Animated.View>
      {[1, 2, 3].map((k) => (
        <Animated.View key={k} style={[styles.skeletonCard, { opacity }]}>
          <Line w="35%" h={11} />
          <Line w="90%" h={13} mt={10} />
          <Line w="75%" h={13} mt={6} />
        </Animated.View>
      ))}
    </ScrollView>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function TicketDetailScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const { detail, isLoadingDetail, detailError, fetchTicketDetail } =
    useMyTickets();

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (ticketId) fetchTicketDetail(Number(ticketId));
  }, [ticketId]);

  useEffect(() => {
    if (detail) {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslate, {
          toValue: 0,
          damping: 20,
          stiffness: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [detail]);

  const statusCfg = detail ? getStatusConfig(detail.status.id) : null;
  const priorityCfg = detail ? getPriorityConfig(detail.priority.id) : null;

  return (
    <ScreenShell theme="light">
      {/* Header */}
      <View style={styles.header}>
        <BackButton
          theme="light"
          label="Mis reportes"
          onPress={() => router.back()}
        />
        <View style={styles.headerTitle}>
          <View style={styles.headerIconWrap}>
            <Ionicons
              name="document-text-outline"
              size={17}
              color={Colors.primary.main}
            />
          </View>
          <Text style={styles.headerText}>
            {detail ? `Reporte #${detail.id}` : "Detalle"}
          </Text>
        </View>
      </View>

      {/* Loading */}
      {isLoadingDetail && <DetailSkeleton />}

      {/* Error */}
      {detailError && !isLoadingDetail && (
        <View style={styles.centered}>
          <View style={styles.errorIconWrap}>
            <Ionicons
              name="cloud-offline-outline"
              size={32}
              color={Colors.screen.textMuted}
            />
          </View>
          <Text style={styles.errorTitle}>Error al cargar</Text>
          <Text style={styles.errorText}>{detailError}</Text>
          <TouchableOpacity
            onPress={() => fetchTicketDetail(Number(ticketId))}
            style={styles.retryBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={14} color={Colors.primary.dark} />
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {detail && statusCfg && priorityCfg && (
        <Animated.View
          style={[
            { flex: 1 },
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslate }],
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Status hero ── */}
            <View
              style={[
                styles.statusHero,
                {
                  backgroundColor: statusCfg.bg,
                  borderColor: statusCfg.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statusHeroIcon,
                  {
                    backgroundColor: statusCfg.bg,
                    borderColor: statusCfg.border,
                  },
                ]}
              >
                <Ionicons
                  name={statusCfg.icon}
                  size={28}
                  color={statusCfg.color}
                />
              </View>
              <View style={styles.statusHeroTexts}>
                <Text
                  style={[styles.statusHeroLabel, { color: statusCfg.color }]}
                >
                  {statusCfg.label}
                </Text>
                <Text
                  style={[styles.statusHeroDesc, { color: statusCfg.color }]}
                >
                  {statusCfg.description}
                </Text>
              </View>
            </View>

            {/* ── Info general ── */}
            <DetailCard
              title="INFORMACIÓN GENERAL"
              icon="information-circle-outline"
            >
              <InfoRow
                icon="location-outline"
                label="Área"
                value={detail.areas.name}
              />
              <View style={styles.rowDivider} />
              <InfoRow
                icon="alert-circle-outline"
                label="Tipo de problema"
                value={detail.error_types.name}
              />
              <View style={styles.rowDivider} />
              <InfoRow
                icon="bar-chart-outline"
                label="Prioridad"
                value={`${priorityCfg.label}`}
                valueColor={priorityCfg.color}
              />
              {detail.sla_deadline && (
                <>
                  <View style={styles.rowDivider} />
                  <InfoRow
                    icon="alarm-outline"
                    label="SLA"
                    value={formatSla(detail.sla_deadline)}
                    valueColor={
                      new Date(detail.sla_deadline) < new Date()
                        ? Colors.status.error
                        : undefined
                    }
                  />
                </>
              )}
              {detail.reopened_count > 0 && (
                <>
                  <View style={styles.rowDivider} />
                  <InfoRow
                    icon="refresh-circle-outline"
                    label="Reaperturas"
                    value={`${detail.reopened_count} vez${detail.reopened_count > 1 ? "ces" : ""}`}
                    valueColor={Colors.status.warning}
                  />
                </>
              )}
            </DetailCard>

            {/* ── Descripción ── */}
            <DetailCard title="DESCRIPCIÓN" icon="create-outline">
              <Text style={styles.descText}>{detail.description}</Text>
            </DetailCard>

            {/* ── Nota de resolución (solo si existe) ── */}
            {detail.resolution_note && (
              <DetailCard
                title="NOTA DE RESOLUCIÓN"
                icon="checkmark-done-outline"
              >
                <View style={styles.resolutionWrap}>
                  <View
                    style={[
                      styles.resolutionAccent,
                      { backgroundColor: Colors.status.success },
                    ]}
                  />
                  <Text style={styles.resolutionText}>
                    {detail.resolution_note}
                  </Text>
                </View>
              </DetailCard>
            )}

            {/* ── Evidencia ── */}
            {detail.evidence_url && (
              <DetailCard title="EVIDENCIA ADJUNTA" icon="image-outline">
                <Image
                  source={{ uri: detail.evidence_url }}
                  style={styles.evidenceImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.evidenceOpenBtn}
                  onPress={() => Linking.openURL(detail.evidence_url!)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="open-outline"
                    size={14}
                    color={Colors.primary.dark}
                  />
                  <Text style={styles.evidenceOpenText}>
                    Abrir imagen completa
                  </Text>
                </TouchableOpacity>
              </DetailCard>
            )}

            {/* ── Timestamps ── */}
            <DetailCard title="FECHAS" icon="calendar-outline">
              <InfoRow
                icon="add-circle-outline"
                label="Creado el"
                value={formatDatetime(detail.created_at)}
              />
              {detail.updated_at !== detail.created_at && (
                <>
                  <View style={styles.rowDivider} />
                  <InfoRow
                    icon="pencil-outline"
                    label="Última actualización"
                    value={formatDatetime(detail.updated_at)}
                  />
                </>
              )}
            </DetailCard>

            {/* Footer */}
            <View style={styles.footer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={12}
                color={Colors.screen.textMuted}
              />
              <Text style={styles.footerText}>
                ADI Soporte · equipo interno
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      )}
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
    backgroundColor: Colors.primary.soft,
    borderWidth: 1,
    borderColor: Colors.primary.muted,
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
    gap: 14,
  },

  // Status hero
  statusHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusHeroBig: {
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  statusHeroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statusHeroTexts: {
    flex: 1,
    gap: 4,
  },
  statusHeroLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
  },
  statusHeroDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.8,
  },

  // Detail card
  detailCard: {
    backgroundColor: Colors.screen.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.screen.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.screen.border,
    backgroundColor: Colors.neutral[50],
  },
  detailCardTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.screen.textMuted,
    letterSpacing: 1.4,
  },
  detailCardBody: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoTexts: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.screen.textMuted,
  },
  infoValue: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.screen.textPrimary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.screen.border,
    marginLeft: 42,
  },

  // Descripción
  descText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.screen.textSecondary,
    lineHeight: 21,
    paddingVertical: 14,
  },

  // Resolución
  resolutionWrap: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 14,
  },
  resolutionAccent: {
    width: 3,
    borderRadius: 2,
    flexShrink: 0,
  },
  resolutionText: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.screen.textSecondary,
    lineHeight: 21,
  },

  // Evidencia
  evidenceImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: Colors.neutral[100],
  },
  evidenceOpenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.primary.soft,
    borderWidth: 1,
    borderColor: Colors.primary.muted,
    marginBottom: 12,
  },
  evidenceOpenText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.primary.dark,
  },

  // Skeleton
  skeletonIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.neutral[200],
  },
  skeletonCard: {
    backgroundColor: Colors.screen.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.screen.border,
    padding: 16,
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 4,
  },
  footerText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.screen.textMuted,
  },

  // Error / centered
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.screen.textSecondary,
  },
  errorText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.screen.textMuted,
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Colors.primary.soft,
    borderWidth: 1,
    borderColor: Colors.primary.muted,
    marginTop: 4,
  },
  retryText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.primary.dark,
  },
});
