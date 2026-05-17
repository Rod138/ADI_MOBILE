import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface LegalModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function LegalModal({ visible, onClose, title, children }: LegalModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.root}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                        <Ionicons name="close" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Content */}
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </ScrollView>

                {/* Footer close button */}
                <View style={styles.footerContainer}>
                    <TouchableOpacity onPress={onClose} style={styles.footerBtn} activeOpacity={0.85}>
                        <Text style={styles.footerBtnText}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

// ── Helper components for structured content ─────────────────────────────────

export function LegalSection({ title }: { title: string }) {
    return <Text style={styles.sectionTitle}>{title}</Text>;
}

export function LegalParagraph({ children }: { children: React.ReactNode }) {
    return <Text style={styles.paragraph}>{children}</Text>;
}

export function LegalBullet({ children }: { children: React.ReactNode }) {
    return (
        <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{children}</Text>
        </View>
    );
}

export function LegalSubheading({ children }: { children: React.ReactNode }) {
    return <Text style={styles.subheading}>{children}</Text>;
}

export function LegalDivider() {
    return <View style={styles.contentDivider} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#1A1A1A",
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
        color: "#FFFFFF",
        flex: 1,
        marginRight: 12,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.1)",
        alignItems: "center",
        justifyContent: "center",
    },

    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.08)",
        marginHorizontal: 20,
    },

    scroll: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        gap: 4,
    },

    sectionTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 14,
        color: "#BEF264",
        marginTop: 20,
        marginBottom: 6,
        letterSpacing: 0.3,
    },

    subheading: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: "#E0E0E0",
        marginTop: 14,
        marginBottom: 4,
    },

    paragraph: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "rgba(255,255,255,0.72)",
        lineHeight: 21,
        marginBottom: 6,
    },

    bulletRow: {
        flexDirection: "row",
        gap: 8,
        paddingLeft: 4,
        marginBottom: 4,
    },
    bulletDot: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#BEF264",
        lineHeight: 21,
    },
    bulletText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "rgba(255,255,255,0.72)",
        lineHeight: 21,
        flex: 1,
    },

    contentDivider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.06)",
        marginVertical: 12,
    },

    footerContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.08)",
    },
    footerBtn: {
        backgroundColor: "#BEF264",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
    },
    footerBtnText: {
        fontFamily: "Outfit_700Bold",
        fontSize: 15,
        color: "#1A1A1A",
        letterSpacing: 0.3,
    },
});
