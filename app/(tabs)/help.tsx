import { ScreenHeader, ScreenShell } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useFaqs, type FaqsByArea } from "@/hooks/useFaqs";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ── Acordeón individual ───────────────────────────────────────────────────────

interface AccordionItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  isLast: boolean;
}

function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
  isLast,
}: AccordionItemProps) {
  const animHeight = useRef(new Animated.Value(0)).current;
  const animRotate = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animHeight, {
        toValue: isOpen ? 1 : 0,
        useNativeDriver: false,
        damping: 20,
        stiffness: 180,
      }),
      Animated.timing(animRotate, {
        toValue: isOpen ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(animOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isOpen]);

  // Estimamos altura máxima basada en la longitud de la respuesta
  const estimatedLines = Math.ceil(answer.length / 55);
  const maxHeight = Math.max(60, estimatedLines * 22 + 28);

  const heightInterpolated = animHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxHeight],
  });

  const rotateInterpolated = animRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={[styles.accordionItem, !isLast && styles.accordionItemBorder]}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.accordionDot}>
          <Ionicons
            name="help"
            size={11}
            color={isOpen ? Colors.primary.dark : Colors.screen.textMuted}
          />
        </View>
        <Text
          style={[
            styles.accordionQuestion,
            isOpen && styles.accordionQuestionOpen,
          ]}
          numberOfLines={isOpen ? undefined : 2}
        >
          {question}
        </Text>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolated }] }}>
          <Ionicons
            name="chevron-down"
            size={16}
            color={isOpen ? Colors.primary.main : Colors.screen.textMuted}
          />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.accordionBody,
          { maxHeight: heightInterpolated, opacity: animOpacity },
        ]}
      >
        <View style={styles.accordionAnswerWrap}>
          <View
            style={[
              styles.answerAccentLine,
              { backgroundColor: Colors.primary.main },
            ]}
          />
          <Text style={styles.accordionAnswer}>{answer}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ── Grupo de área con acordeón ────────────────────────────────────────────────

interface AreaGroupProps {
  group: FaqsByArea;
  index: number;
}

// Íconos por nombre de área (fallback a help-circle)
function getAreaIcon(areaName: string): keyof typeof Ionicons.glyphMap {
  const n = areaName.toLowerCase();
  if (n.includes("elevad") || n.includes("ascens"))
    return "arrow-up-circle-outline";
  if (n.includes("estacion") || n.includes("parking")) return "car-outline";
  if (
    n.includes("alberca") ||
    n.includes("piscin") ||
    n.includes("gym") ||
    n.includes("amenidad")
  )
    return "fitness-outline";
  if (n.includes("seguridad") || n.includes("acceso")) return "shield-outline";
  if (n.includes("pago") || n.includes("cuota") || n.includes("financ"))
    return "wallet-outline";
  if (n.includes("incidencia") || n.includes("reporte"))
    return "warning-outline";
  if (n.includes("general") || n.includes("admin")) return "settings-outline";
  if (n.includes("ruido") || n.includes("convivencia")) return "people-outline";
  if (n.includes("mascota")) return "paw-outline";
  return "help-circle-outline";
}

// Colores por índice — rota entre los colores del sistema
function getAreaAccent(index: number) {
  const accents = [
    {
      color: Colors.primary.main,
      bg: Colors.primary.soft,
      border: Colors.primary.muted,
      dark: Colors.primary.dark,
    },
    {
      color: Colors.secondary.main,
      bg: Colors.secondary.soft,
      border: "#FED7AA",
      dark: "#C2410C",
    },
    { color: "#0891B2", bg: "#F0F9FF", border: "#BAE6FD", dark: "#0E7490" },
    { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dark: "#6D28D9" },
    {
      color: Colors.status.success,
      bg: Colors.status.successBg,
      border: Colors.status.successBorder,
      dark: "#15803D",
    },
  ];
  return accents[index % accents.length];
}

function AreaGroup({ group, index }: AreaGroupProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const accent = getAreaAccent(index);
  const icon = getAreaIcon(group.area.name);

  const handleToggle = (i: number) => {
    setOpenIndex((prev) => (prev === i ? null : i));
  };

  return (
    <View style={styles.areaGroup}>
      {/* Header de área */}
      <View style={styles.areaHeader}>
        <View
          style={[
            styles.areaIconWrap,
            { backgroundColor: accent.bg, borderColor: accent.border },
          ]}
        >
          <Ionicons name={icon} size={18} color={accent.color} />
        </View>
        <View style={styles.areaTitles}>
          <Text style={[styles.areaName, { color: accent.dark }]}>
            {group.area.name}
          </Text>
          {group.area.description ? (
            <Text style={styles.areaDescription} numberOfLines={1}>
              {group.area.description}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.areaCountBadge,
            { backgroundColor: accent.bg, borderColor: accent.border },
          ]}
        >
          <Text style={[styles.areaCountText, { color: accent.dark }]}>
            {group.faqs.length}
          </Text>
        </View>
      </View>

      {/* Acordeón de FAQs */}
      <View style={[styles.accordionCard, { borderTopColor: accent.color }]}>
        {group.faqs.map((faq, i) => (
          <AccordionItem
            key={faq.id}
            question={faq.question}
            answer={faq.answer}
            isOpen={openIndex === i}
            onToggle={() => handleToggle(i)}
            isLast={i === group.faqs.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonItem() {
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
    <Animated.View style={[styles.skeletonGroup, { opacity }]}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonTitleWrap}>
          <View style={[styles.skeletonLine, { width: "55%", height: 13 }]} />
          <View
            style={[
              styles.skeletonLine,
              { width: "80%", height: 10, marginTop: 5 },
            ]}
          />
        </View>
      </View>
      <View style={styles.skeletonCard}>
        {[1, 2, 3].map((k) => (
          <View
            key={k}
            style={[styles.skeletonRow, k < 3 && styles.skeletonRowBorder]}
          >
            <View
              style={[
                styles.skeletonLine,
                { width: `${60 + k * 10}%` as any, height: 11 },
              ]}
            />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ── Card de reportar error ────────────────────────────────────────────────────

function ReportCard({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 60,
      bounciness: 2,
    }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  return (
    <Animated.View
      style={[styles.reportCardWrap, { transform: [{ scale: scaleAnim }] }]}
    >
      <TouchableOpacity
        style={styles.reportCard}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Accent bar */}
        <View style={styles.reportAccentBar} />

        <View style={styles.reportInner}>
          <View style={styles.reportLeft}>
            <View style={styles.reportIconWrap}>
              <Ionicons
                name="bug-outline"
                size={24}
                color={Colors.status.error}
              />
            </View>
            <View style={styles.reportTexts}>
              <Text style={styles.reportTitle}>Reportar un problema</Text>
              <Text style={styles.reportSubtitle}>
                ¿Algo no funciona bien? Cuéntanos y lo resolveremos.
              </Text>
            </View>
          </View>
          <View style={styles.reportArrow}>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={Colors.status.error}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function HelpScreen() {
  const { faqsByArea, isLoading, error, fetchFaqs } = useFaqs();

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleReport = () => {
    router.push("/(help)/report-error" as any);
  };

  const handleMyReports = () => {
    router.push("/(help)/my-tickets" as any);
  };

  return (
    <ScreenShell theme="light">
      <ScreenHeader
        theme="light"
        title="Ayuda"
        logoIcon="help-circle"
        rightActions={[{ icon: "refresh-outline", onPress: fetchFaqs }]}
      />

      {/* ── Loading ── */}
      {isLoading ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
        </ScrollView>
      ) : error ? (
        /* ── Error ── */
        <View style={styles.centered}>
          <View style={styles.stateIconWrap}>
            <Ionicons
              name="cloud-offline-outline"
              size={32}
              color={Colors.screen.textMuted}
            />
          </View>
          <Text style={styles.stateTitle}>Error al cargar</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            onPress={fetchFaqs}
            style={styles.retryBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={14} color={Colors.primary.dark} />
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : faqsByArea.length === 0 ? (
        /* ── Vacío ── */
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons
              name="help-buoy-outline"
              size={36}
              color={Colors.screen.textMuted}
            />
          </View>
          <Text style={styles.stateTitle}>Sin preguntas frecuentes</Text>
          <Text style={styles.stateText}>
            Aún no hay preguntas frecuentes disponibles.
          </Text>
        </View>
      ) : (
        /* ── Contenido ── */
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Section label */}
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>PREGUNTAS FRECUENTES</Text>
            <View style={styles.sectionLabelLine} />
          </View>

          {/* FAQ groups */}
          {faqsByArea.map((group, index) => (
            <AreaGroup key={group.area.id} group={group} index={index} />
          ))}

          {/* Divider antes de reporte */}
          <View style={styles.dividerSection}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              ¿NO ENCONTRASTE LO QUE BUSCAS?
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Card de reporte */}
          <ReportCard onPress={handleReport} />

          {/* Botón de mis reportes */}
          <TouchableOpacity
            style={styles.myReportsBtn}
            onPress={handleMyReports}
            activeOpacity={0.6}
          >
            <Ionicons
              name="document-text-outline"
              size={14}
              color={Colors.screen.textMuted}
            />
            <Text style={styles.myReportsBtnText}>Ver mis reportes</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={12}
              color={Colors.screen.textMuted}
            />
            <Text style={styles.footerText}>ADI · Soporte v1.0</Text>
          </View>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 16,
  },

  // ── Estados ──────────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  stateIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary.soft,
    borderWidth: 1,
    borderColor: Colors.primary.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.screen.textSecondary,
  },
  stateText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.screen.textMuted,
    textAlign: "center",
    lineHeight: 20,
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

  // ── Intro banner ──────────────────────────────────────────────────────────
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
  introIconWrap: {
    marginTop: 1,
    flexShrink: 0,
  },
  introText: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.primary.dark,
    lineHeight: 19,
  },

  // ── Section label ─────────────────────────────────────────────────────────
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionLabelText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.screen.textMuted,
    letterSpacing: 1.8,
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.screen.border,
  },
  sectionCount: {
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
  sectionCountText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.primary.dark,
  },

  // ── Grupo de área ─────────────────────────────────────────────────────────
  areaGroup: {
    gap: 10,
  },
  areaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  areaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  areaTitles: {
    flex: 1,
    gap: 2,
  },
  areaName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
  },
  areaDescription: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.screen.textMuted,
  },
  areaCountBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    flexShrink: 0,
  },
  areaCountText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
  },

  // ── Acordeón ──────────────────────────────────────────────────────────────
  accordionCard: {
    backgroundColor: Colors.screen.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.screen.border,
    overflow: "hidden",
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accordionItem: {
    overflow: "hidden",
  },
  accordionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.screen.border,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  accordionDot: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.screen.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  accordionQuestion: {
    flex: 1,
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.screen.textSecondary,
    lineHeight: 19,
  },
  accordionQuestionOpen: {
    fontFamily: "Outfit_600SemiBold",
    color: Colors.screen.textPrimary,
  },
  accordionBody: {
    overflow: "hidden",
  },
  accordionAnswerWrap: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  answerAccentLine: {
    width: 3,
    borderRadius: 2,
    flexShrink: 0,
    alignSelf: "stretch",
  },
  accordionAnswer: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.screen.textSecondary,
    lineHeight: 20,
  },

  // ── Skeleton ──────────────────────────────────────────────────────────────
  skeletonGroup: {
    gap: 10,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skeletonIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: Colors.neutral[200],
    flexShrink: 0,
  },
  skeletonTitleWrap: {
    flex: 1,
    gap: 4,
  },
  skeletonLine: {
    backgroundColor: Colors.neutral[200],
    borderRadius: 6,
  },
  skeletonCard: {
    backgroundColor: Colors.screen.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.screen.border,
    overflow: "hidden",
  },
  skeletonRow: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  skeletonRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.screen.border,
  },

  // ── Divider de sección ────────────────────────────────────────────────────
  dividerSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.screen.border,
  },
  dividerText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 9,
    color: Colors.screen.textMuted,
    letterSpacing: 1.4,
  },

  // ── Card de reporte ───────────────────────────────────────────────────────
  reportCardWrap: {},
  reportCard: {
    backgroundColor: Colors.screen.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.status.errorBorder,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reportAccentBar: {
    height: 3,
    backgroundColor: Colors.status.error,
  },
  reportInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  reportLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reportIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.status.errorBg,
    borderWidth: 1.5,
    borderColor: Colors.status.errorBorder,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reportTexts: {
    flex: 1,
    gap: 3,
  },
  reportTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.screen.textPrimary,
  },
  reportSubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.screen.textMuted,
    lineHeight: 17,
  },
  reportArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.status.errorBg,
    borderWidth: 1,
    borderColor: Colors.status.errorBorder,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
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

  // ── Botón mis reportes ────────────────────────────────────────────────────
  myReportsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  myReportsBtnText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.screen.textMuted,
  },
});
