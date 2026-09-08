import { createElement } from "react";
import { Image, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";

const INK = "#1F2937";

const WORDMARK_FONT = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia, 'Times New Roman', Times, serif",
});

const CAMERA_A = require("../../assets/images/book-a-shoot-camera-a.png");
/** Transparent camera/tripod A cropped from the supplied mark (554×1024). */
const CAMERA_A_ASPECT = 554 / 1024;

/** Camera-and-tripod letter A with the black plate removed. */
export function CameraA({ height }: { height: number }) {
  const width = Math.max(12, Math.round(height * CAMERA_A_ASPECT));
  if (Platform.OS === "web") {
    const asset = CAMERA_A as number | string | { uri?: string };
    const uri =
      typeof asset === "string"
        ? asset
        : typeof asset === "object" && asset?.uri
          ? asset.uri
          : String(asset);
    return createElement("img", {
      src: uri,
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
      source={CAMERA_A}
      resizeMode="contain"
      style={{ width, height }}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

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
    ? Math.min(maxWidth, screenWidth - 96)
    : Math.min(maxWidth, Math.round(screenWidth * widthFraction), screenWidth - 32);

  const fontSize = compact
    ? Math.min(18, Math.max(15, Math.round(available / 16)))
    : Math.min(34, Math.max(22, Math.round(available / 10.6)));
  const aHeight = compact ? Math.round(fontSize * 1.55) : Math.round(fontSize * 1.85);
  const letterSpacing = compact ? 0.8 : 1.6;

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="BOOK A SHOOT"
      style={[styles.row, compact ? styles.rowStart : styles.rowCenter]}
    >
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
        style={[styles.word, { fontSize, letterSpacing, lineHeight: Math.round(fontSize * 1.15) }]}
      >
        BOOK
      </Text>
      <View style={[styles.aWrap, { height: aHeight, marginHorizontal: compact ? 5 : 8 }]}>
        <CameraA height={aHeight} />
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
        style={[styles.word, { fontSize, letterSpacing, lineHeight: Math.round(fontSize * 1.15) }]}
      >
        SHOOT
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
  },
  rowCenter: { alignSelf: "center", justifyContent: "center" },
  rowStart: { alignSelf: "flex-start", justifyContent: "flex-start" },
  word: {
    color: INK,
    fontFamily: WORDMARK_FONT,
    fontWeight: "700",
    flexShrink: 0,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  aWrap: { justifyContent: "center", alignItems: "center" },
});
