/**
 * SEOImage — Production Grade Image Component for Photography Marketplaces
 *
 * Implements strict Technical Image SEO & Core Web Vitals best practices:
 * 1. Semantic <img> tag on web for 100% crawler visibility (Google Images, Perplexity, Bing).
 * 2. Mandatory descriptive alt text for accessibility and ranking.
 * 3. Eager loading + fetchPriority="high" for hero/LCP candidate images.
 * 4. Native loading="lazy" + decoding="async" for all below-the-fold assets.
 * 5. Explicit width/height to eliminate Cumulative Layout Shift (CLS).
 * 6. Responsive object-fit styles (cover, contain).
 * 7. Seamless cross-platform fallback to React Native <Image> on iOS & Android.
 */

import React from "react";
import { Image, ImageStyle, Platform, StyleProp, StyleSheet } from "react-native";

export interface SEOImageProps {
  /** Source URL on web (e.g. "/hero1.webp") or ImageRequireSource on native */
  src: string | { uri: string } | any;
  /** Mandatory descriptive alt text for Google Image SEO and screen readers */
  alt: string;
  /** Native require fallback when running on iOS/Android */
  nativeSource?: any;
  /** Explicit pixel width or CSS percentage to prevent CLS */
  width?: number | string;
  /** Explicit pixel height or CSS percentage to prevent CLS */
  height?: number | string;
  /**
   * Set to true for Largest Contentful Paint (LCP) candidates (Hero slides).
   * Elevates priority with fetchpriority="high" and loading="eager".
   */
  priority?: boolean;
  /** Image scaling mode */
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  /** Optional container/image styles */
  style?: StyleProp<ImageStyle>;
  /** Optional test identifier */
  testID?: string;
}

export const SEOImage: React.FC<SEOImageProps> = ({
  src,
  alt,
  nativeSource,
  width,
  height,
  priority = false,
  resizeMode = "cover",
  style,
  testID,
}) => {
  // ── Web Rendering (Semantic <img> with Fetch Priority & Lazy Loading) ──────
  if (Platform.OS === "web") {
    let webSrc = "";
    if (typeof src === "string") {
      webSrc = src;
    } else if (src && typeof src === "object" && "uri" in src) {
      webSrc = src.uri;
    } else if (typeof src === "number" || (src && typeof src === "object")) {
      webSrc = (src as any)?.default || src;
    }

    if (!webSrc && nativeSource) {
      webSrc = (nativeSource as any)?.default || nativeSource;
    }

    const flatStyle = StyleSheet.flatten(style) || {};

    const imgStyle: React.CSSProperties = {
      width: width !== undefined ? (typeof width === "number" ? `${width}px` : width) : "100%",
      height: height !== undefined ? (typeof height === "number" ? `${height}px` : height) : "100%",
      objectFit: resizeMode === "contain" ? "contain" : resizeMode === "cover" ? "cover" : "fill",
      display: "block",
      ...(flatStyle as any),
    };

    return (
      <img
        src={webSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        style={imgStyle}
        data-testid={testID}
      />
    );
  }

  // ── Native Mobile Rendering (React Native <Image>) ─────────────────────────
  const source =
    nativeSource ||
    (typeof src === "string" ? { uri: src } : src);

  return (
    <Image
      source={source}
      style={[
        width !== undefined && typeof width === "number" ? { width } : undefined,
        height !== undefined && typeof height === "number" ? { height } : undefined,
        style,
      ]}
      resizeMode={resizeMode}
      accessibilityLabel={alt}
      testID={testID}
    />
  );
};
