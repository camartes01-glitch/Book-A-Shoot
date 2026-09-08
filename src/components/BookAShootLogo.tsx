import { createElement } from "react";
import { Image, Platform, StyleSheet, View, useWindowDimensions } from "react-native";

/** Transparent BOOK [camera-A] SHOOT lockup from the supplied original artwork (1698×707). */
const WORDMARK = require("../../assets/images/book-a-shoot-wordmark.png");
const WORDMARK_ASPECT = 1698 / 707;

function assetUri(asset: number | string | { uri?: string }): string {
  if (typeof asset === "string") return asset;
  if (typeof asset === "object" && asset?.uri) return asset.uri;
  return String(asset);
}

function WordmarkImage({ width, height }: { width: number; height: number }) {
  if (Platform.OS === "web") {
    return createElement("img", {
      src: assetUri(WORDMARK as number | string | { uri?: string }),
      alt: "",
      "aria-hidden": true,
      width,
      height,
      draggable: false,
      style: { width, height, display: "block", objectFit: "contain" },
    });
  }
  return (
    <Image
      source={WORDMARK}
      resizeMode="contain"
      style={{ width, height }}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

/** In-app BOOK A SHOOT wordmark from the supplied original artwork, scaled proportionally. */
export function BookAShootLogo({
  maxWidth = 340,
  widthFraction = 0.84,
  compact = false,
}: {
  maxWidth?: number;
  widthFraction?: number;
  compact?: boolean;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const available = compact
    ? Math.min(200, Math.max(168, screenWidth - 120))
    : Math.min(maxWidth, Math.round(screenWidth * widthFraction), screenWidth - 32);

  const width = Math.max(168, available);
  const height = Math.max(1, Math.round(width / WORDMARK_ASPECT));

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="BOOK A SHOOT"
      style={[styles.wrap, compact ? styles.wrapStart : styles.wrapCenter, { width, height }]}
    >
      <WordmarkImage width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "visible" },
  wrapCenter: { alignSelf: "center" },
  wrapStart: { alignSelf: "flex-start" },
});
