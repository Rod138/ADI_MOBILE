import { BackButton, ScreenShell } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useMyTickets, type Ticket } from "@/hooks/useMyTickets";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusConfig(statusId: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  switch (statusId) {
    case 1:
      return {
        label: "Pendiente",
        color: Colors.status.warning,
        bg: Colors.status.warningBg,
        border: Colors.status.warningBorder,
        icon: "time-outline",
      };
    case 2:
      return {
        label: "En revisión",
        color: Colors.status.info,
        bg: Colors.status.infoBg,
        border: Colors.status.infoBorder,
        icon: "search-outline",
      };
    case 3:
      return {
        label: "Resuelto",
        color: Colors.status.success,
        bg: Colors.status.successBg,
        border: Colors.status.successBorder,
        icon: "checkmark-circle-outline",
      };
    case 4:
      return {
        label: "Cerrado",
        color: Colors.neutral[500],
        bg: Colors.neutral[100],
        border: Colors.neutral[200],
        icon: "lock-closed-outline",
      };
    default:
      return {
        label: "Desconocido",
        color: Colors.neutral[500],
        bg: Colors.neutral[100],
        border: Colors.neutral[200],
        icon: "help-outline",
      };
  }
}

function getPriorityConfig(priorityId: number): {
  color: string;
  label: string;
  dot: string;
} {
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Ticket Card ───────────────────────────────────────────────────────────────

interface TicketCardProps {
  ticket: Ticket;
  index: number;
  onPress: () => void;
}

function TicketCard({ ticket, index, onPress }: TicketCardProps) {
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 20,
        stiffness: 160,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const statusCfg = getStatusConfig(ticket.status.id);
  const priorityCfg = getPriorityConfig(ticket.priority.id);

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.977,
      useNativeDriver: true,
      speed: 60,
      bounciness: 2,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  return (
    <Animated.View
      style={[
        styles.cardWrap,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={styles.cardMeta}>
            <Text style={styles.ticketId}>#{ticket.id}</Text>
            <Text style={styles.ticketDate}>
              {formatDate(ticket.created_at)}
            </Text>
          </View>

          {/* Status badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusCfg.bg, borderColor: statusCfg.border },
            ]}
          >
            <Ionicons name={statusCfg.icon} size={11} color={statusCfg.color} />
            <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Area & Error type */}
        <View style={styles.cardTags}>
          <View style={styles.tag}>
            <Ionicons
              name="location-outline"
              size={11}
              color={Colors.primary.dark}
            />
            <Text style={styles.tagText} numberOfLines={1}>
              {ticket.areas.name}
            </Text>
          </View>
          <View style={[styles.tag, styles.tagGray]}>
            <Ionicons
              name="alert-circle-outline"
              size={11}
              color={Colors.screen.textMuted}
            />
            <Text
              style={[styles.tagText, styles.tagTextGray]}
              numberOfLines={1}
            >
              {ticket.error_types.name}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {ticket.description}
        </Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.priorityRow}>
            <View
              style={[styles.priorityDot, { backgroundColor: priorityCfg.dot }]}
            />
            <Text style={[styles.priorityLabel, { color: priorityCfg.color }]}>
              Prioridad {priorityCfg.label}
            </Text>
          </View>

          {ticket.evidence_url && (
            <View style={styles.evidenceChip}>
              <Ionicons
                name="image-outline"
                size={11}
                color={Colors.primary.dark}
              />
              <Text style={styles.evidenceChipText}>Con evidencia</Text>
            </View>
          )}

          <View style={styles.arrowWrap}>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={Colors.screen.textMuted}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
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

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonRow}>
        <View style={[styles.skeletonLine, { width: 60, height: 13 }]} />
        <View
          style={[
            styles.skeletonLine,
            { width: 80, height: 22, borderRadius: 10 },
          ]}
        />
      </View>
      <View
        style={[
          styles.skeletonLine,
          { width: "45%", height: 11, marginTop: 10 },
        ]}
      />
      <View
        style={[
          styles.skeletonLine,
          { width: "90%", height: 11, marginTop: 8 },
        ]}
      />
      <View
        style={[
          styles.skeletonLine,
          { width: "70%", height: 11, marginTop: 4 },
        ]}
      />
    </Animated.View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Ionicons
          name="file-tray-outline"
          size={36}
          color={Colors.screen.textMuted}
        />
      </View>
      <Text style={styles.emptyTitle}>Sin reportes aún</Text>
      <Text style={styles.emptyText}>
        Cuando reportes un problema, aparecerá aquí con su estado actualizado.
      </Text>
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function MyTicketsScreen() {
  const { tickets, isLoading, error, fetchMyTickets } = useMyTickets();

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const handleTicketPress = (ticketId: number) => {
    router.push(`/(help)/ticket-detail?ticketId=${ticketId}` as any);
  };

  return (
    <ScreenShell theme="light">
      {/* Header */}
      <View style={styles.header}>
        <BackButton theme="light" label="Ayuda" onPress={() => router.back()} />
        <View style={styles.headerTitle}>
          <View style={styles.headerIconWrap}>
            <Ionicons
              name="receipt-outline"
              size={17}
              color={Colors.primary.main}
            />
          </View>
          <Text style={styles.headerText}>Mis reportes</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetchMyTickets}
          activeOpacity={0.7}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={Colors.screen.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.scroll}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <View style={styles.errorIconWrap}>
            <Ionicons
              name="cloud-offline-outline"
              size={32}
              color={Colors.screen.textMuted}
            />
          </View>
          <Text style={styles.errorTitle}>Error al cargar</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={fetchMyTickets}
            style={styles.retryBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={14} color={Colors.primary.dark} />
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
          ListHeaderComponent={
            tickets.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderLabel}>HISTORIAL</Text>
                <View style={styles.listHeaderBadge}>
                  <Text style={styles.listHeaderCount}>{tickets.length}</Text>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <TicketCard
              ticket={item}
              index={index}
              onPress={() => handleTicketPress(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
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
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.screen.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  listHeaderLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.screen.textMuted,
    letterSpacing: 1.8,
  },
  listHeaderBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary.soft,
    borderWidth: 1,
    borderColor: Colors.primary.muted,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  listHeaderCount: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.primary.dark,
  },

  scroll: {
    padding: 16,
    gap: 10,
  },

  // Card
  cardWrap: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    backgroundColor: Colors.screen.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.screen.border,
    padding: 14,
    gap: 10,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ticketId: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: Colors.primary.dark,
  },
  ticketDate: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.screen.textMuted,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 10,
  },
  cardTags: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary.soft,
    borderWidth: 1,
    borderColor: Colors.primary.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagGray: {
    backgroundColor: Colors.neutral[100],
    borderColor: Colors.neutral[200],
  },
  tagText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 11,
    color: Colors.primary.dark,
  },
  tagTextGray: {
    color: Colors.screen.textSecondary,
  },
  description: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.screen.textSecondary,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: Colors.screen.border,
    marginTop: 2,
  },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  priorityLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 11,
  },
  evidenceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary.soft,
    borderWidth: 1,
    borderColor: Colors.primary.muted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  evidenceChipText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 10,
    color: Colors.primary.dark,
  },
  arrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Skeleton
  skeletonCard: {
    backgroundColor: Colors.screen.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.screen.border,
    padding: 14,
    marginBottom: 10,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skeletonLine: {
    backgroundColor: Colors.neutral[200],
    borderRadius: 6,
  },

  // Empty
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.screen.textSecondary,
  },
  emptyText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.screen.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  // Error/centered
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
