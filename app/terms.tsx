/**
 * Book A Shoot — Official Terms & Conditions
 * Exact official terms as mandated, covering all 64 sections, platform operation
 * by GURRAM SAI AMARNATH under Camartes Photography Ecosystem, using info@bookashoot.online.
 */

import React, { useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UniversalFooter } from "@/src/components/UniversalFooter";
import { SEOHead } from "@/src/components/SEOHead";
import { ArrowLeft } from "lucide-react-native";
import { colors, radius, spacing } from "@/src/constants/theme";
import { TERMS_AND_CONDITIONS_TEXT } from "@/src/constants/termsAndConditions";

type BlockType =
  | "title"
  | "header-meta"
  | "date-badge"
  | "divider"
  | "section-heading"
  | "sub-heading"
  | "letter-heading"
  | "category-heading"
  | "bullet-list"
  | "numbered-list"
  | "paragraph"
  | "end-notice";

interface PolicyBlock {
  type: BlockType;
  content: string;
  key: string;
}

export default function TermsPage() {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 768;

  const goToHome = () => router.push("/landing");

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Terms & Conditions — Book A Shoot";
    }
  }, []);

  const blocks = useMemo<PolicyBlock[]>(() => {
    return TERMS_AND_CONDITIONS_TEXT.split(/\r?\n\r?\n/).map((block, index) => {
      const trimmed = block.trim();
      let type: BlockType = "paragraph";

      if (trimmed === "---") {
        type = "divider";
      } else if (trimmed === "TERMS & CONDITIONS") {
        type = "title";
      } else if (/^\d+\.\s+[A-Z0-9\s?,.'()/-]+$/.test(trimmed)) {
        type = "section-heading";
      } else if (/^\d+\.\d+\s+/.test(trimmed)) {
        type = "sub-heading";
      } else if (/^[A-Z]\.\s+[A-Za-z\s]+$/.test(trimmed)) {
        type = "letter-heading";
      } else if (
        ["Photography", "Videography", "Additional Services"].includes(trimmed)
      ) {
        type = "category-heading";
      } else if (trimmed.startsWith("- ")) {
        type = "bullet-list";
      } else if (/^\d+\.\s+/.test(trimmed) && trimmed.includes("\n")) {
        type = "numbered-list";
      } else if (trimmed.startsWith("Book A Shoot\nOperated by:")) {
        type = "header-meta";
      } else if (
        trimmed.startsWith("Effective Date:") &&
        trimmed.includes("Last Updated:")
      ) {
        type = "date-badge";
      } else if (trimmed === "End of Terms & Conditions") {
        type = "end-notice";
      }

      return {
        type,
        content: trimmed,
        key: `block-${index}`,
      };
    });
  }, []);

  return (
    <View style={styles.root}>
      <SEOHead
        title="Terms & Conditions — Book A Shoot"
        description="Review the official platform terms, escrow payment policies, and cancellation conditions for Book A Shoot."
        canonicalPath="/terms"
      />

      {/* ── Top Navbar ─────────────────────────────────────────────────── */}
      <View style={[styles.navbar, { paddingTop: insets.top }]}>
        <View style={[styles.navInner, isWide && styles.navInnerWide]}>
          <Pressable
            onPress={goToHome}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
          >
            <ArrowLeft size={18} color={colors.text} />
            <Text style={styles.backBtnText}>Home</Text>
          </Pressable>

          <Pressable onPress={goToHome}>
            <Image
              source={require("@/assets/images/book-a-shoot-wordmark.png")}
              style={[styles.navLogo, !isWide && styles.navLogoPhone]}
              resizeMode="contain"
              accessibilityLabel="Book A Shoot"
            />
          </Pressable>

          <View style={{ width: 60 }} />
        </View>
      </View>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + 94, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, isWide && styles.containerWide]}>
          <View style={styles.card}>
            {blocks.map((block) => {
              switch (block.type) {
                case "divider":
                  return <View key={block.key} style={styles.divider} />;

                case "title":
                  return (
                    <Text key={block.key} selectable style={styles.title}>
                      {block.content}
                    </Text>
                  );

                case "header-meta":
                  return (
                    <View key={block.key} style={styles.metaBox}>
                      <Text selectable style={styles.metaText}>
                        {block.content}
                      </Text>
                    </View>
                  );

                case "date-badge":
                  return (
                    <View key={block.key} style={styles.dateBox}>
                      <Text selectable style={styles.dateText}>
                        {block.content}
                      </Text>
                    </View>
                  );

                case "section-heading":
                  return (
                    <Text key={block.key} selectable style={styles.sectionTitle}>
                      {block.content}
                    </Text>
                  );

                case "sub-heading":
                  return (
                    <Text key={block.key} selectable style={styles.subHeading}>
                      {block.content}
                    </Text>
                  );

                case "letter-heading":
                  return (
                    <Text key={block.key} selectable style={styles.letterHeading}>
                      {block.content}
                    </Text>
                  );

                case "category-heading":
                  return (
                    <Text key={block.key} selectable style={styles.categoryHeading}>
                      {block.content}
                    </Text>
                  );

                case "bullet-list":
                  return (
                    <View key={block.key} style={styles.bulletList}>
                      <Text selectable style={styles.bulletItem}>
                        {block.content}
                      </Text>
                    </View>
                  );

                case "numbered-list":
                  return (
                    <View key={block.key} style={styles.numberedList}>
                      <Text selectable style={styles.numberedItem}>
                        {block.content}
                      </Text>
                    </View>
                  );

                case "end-notice":
                  return (
                    <Text key={block.key} selectable style={styles.endNotice}>
                      {block.content}
                    </Text>
                  );

                case "paragraph":
                default:
                  return (
                    <Text key={block.key} selectable style={styles.paragraph}>
                      {block.content}
                    </Text>
                  );
              }
            })}
          </View>
        </View>
        <UniversalFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  navbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navInner: {
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  navInnerWide: {
    paddingHorizontal: 48,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  navLogo: {
    width: 220,
    height: 56,
  },
  navLogoPhone: {
    width: 135,
    height: 34,
  },
  container: {
    paddingHorizontal: spacing.xl,
    maxWidth: 860,
    alignSelf: "center",
    width: "100%",
  },
  containerWide: {
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primaryDark,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  metaBox: {
    backgroundColor: colors.bgWarm,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    padding: spacing.md,
    marginVertical: spacing.xs,
  },
  metaText: {
    fontSize: 14,
    color: colors.primaryDark,
    lineHeight: 22,
    fontWeight: "500",
  },
  dateBox: {
    alignSelf: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    marginVertical: spacing.sm,
  },
  dateText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primaryDark,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    lineHeight: 24,
  },
  subHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  letterHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryDark,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  categoryHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primaryDark,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    marginVertical: 4,
  },
  bulletList: {
    marginVertical: 4,
    paddingLeft: spacing.xs,
  },
  bulletItem: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  numberedList: {
    marginVertical: 4,
    paddingLeft: spacing.xs,
  },
  numberedItem: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  endNotice: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primaryDark,
    textAlign: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
  },
});
