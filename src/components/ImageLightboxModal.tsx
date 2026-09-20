import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { spacing } from "@/src/constants/theme";

interface ImageLightboxModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

export function ImageLightboxModal({
  visible,
  images,
  initialIndex = 0,
  title,
  onClose,
}: ImageLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const prevVisibleRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const thumbnailScrollRef = useRef<ScrollView>(null);

  // Initialize currentIndex ONLY when the modal transitions from closed to open
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      const validIndex = Math.max(0, Math.min(initialIndex, Math.max(0, images.length - 1)));
      setCurrentIndex(validIndex);
    }
    prevVisibleRef.current = visible;
  }, [visible, initialIndex, images.length]);

  // Keep index within bounds if images array size changes
  useEffect(() => {
    if (images.length > 0 && currentIndex >= images.length) {
      setCurrentIndex(images.length - 1);
    }
  }, [images.length, currentIndex]);

  // Auto-scroll thumbnail strip to center the active thumbnail
  useEffect(() => {
    if (visible && thumbnailScrollRef.current && currentIndex >= 0) {
      // Each thumbnail is 56px + 8px gap = 64px
      const targetX = Math.max(0, currentIndex * 64 - 120);
      thumbnailScrollRef.current.scrollTo({ x: targetX, animated: true });
    }
  }, [currentIndex, visible]);

  // Preload adjacent images in memory for instant zero-latency switching
  useEffect(() => {
    if (!visible || !images || images.length === 0) return;
    const toPreload = [
      images[currentIndex - 1],
      images[currentIndex + 1],
      images[currentIndex + 2],
    ].filter(Boolean);

    toPreload.forEach((uri) => {
      try {
        Image.prefetch(uri);
      } catch {
        // Safe catch for prefetching
      }
    });
  }, [currentIndex, images, visible]);

  // Keyboard navigation on Web (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(images.length - 1, prev + 1));
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, images.length, onClose]);

  if (!visible || images.length === 0) return null;

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < images.length - 1;
  const currentUri = images[currentIndex] || images[0];

  const handlePrev = () => {
    if (canGoPrev) {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setCurrentIndex((prev) => Math.min(images.length - 1, prev + 1));
    }
  };

  // Touch swipe support for mobile touch screens
  const onTouchStart = (e: any) => {
    if (Platform.OS === "web" && !("ontouchstart" in window)) return;
    touchStartX.current = e.nativeEvent?.pageX ?? e.nativeEvent?.clientX ?? null;
  };

  const onTouchEnd = (e: any) => {
    if (touchStartX.current === null) return;
    const endX = e.nativeEvent?.pageX ?? e.nativeEvent?.clientX ?? null;
    if (endX !== null) {
      const diff = touchStartX.current - endX;
      if (diff > 50 && canGoNext) {
        handleNext();
      } else if (diff < -50 && canGoPrev) {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={styles.topTitleWrap}>
            {title ? (
              <Text style={styles.topTitle} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {images.length}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Close photo viewer"
          >
            <X size={22} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Main Photo Display Stage */}
        <View
          style={styles.mainStage}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {currentUri ? (
            <Image
              source={{ uri: currentUri }}
              style={styles.mainImage}
              resizeMode="contain"
              accessibilityLabel={`Photo ${currentIndex + 1} of ${images.length}`}
            />
          ) : (
            <View style={styles.errorPlaceholder}>
              <Text style={styles.errorPlaceholderText}>Photo unavailable</Text>
            </View>
          )}

          {/* Validated Left Arrow Button */}
          {images.length > 1 ? (
            <Pressable
              onPress={handlePrev}
              disabled={!canGoPrev}
              style={({ pressed }) => [
                styles.arrowBtn,
                styles.leftArrow,
                !canGoPrev && styles.arrowBtnDisabled,
                canGoPrev && pressed && styles.arrowBtnPressed,
                Platform.OS === "web" && ({
                  cursor: canGoPrev ? "pointer" : "default",
                  userSelect: "none",
                } as any),
              ]}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              accessibilityRole="button"
              accessibilityLabel="Previous photo"
              accessibilityState={{ disabled: !canGoPrev }}
            >
              <ChevronLeft
                size={28}
                color={canGoPrev ? "#FFFFFF" : "rgba(255, 255, 255, 0.35)"}
                strokeWidth={3}
              />
            </Pressable>
          ) : null}

          {/* Validated Right Arrow Button */}
          {images.length > 1 ? (
            <Pressable
              onPress={handleNext}
              disabled={!canGoNext}
              style={({ pressed }) => [
                styles.arrowBtn,
                styles.rightArrow,
                !canGoNext && styles.arrowBtnDisabled,
                canGoNext && pressed && styles.arrowBtnPressed,
                Platform.OS === "web" && ({
                  cursor: canGoNext ? "pointer" : "default",
                  userSelect: "none",
                } as any),
              ]}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              accessibilityRole="button"
              accessibilityLabel="Next photo"
              accessibilityState={{ disabled: !canGoNext }}
            >
              <ChevronRight
                size={28}
                color={canGoNext ? "#FFFFFF" : "rgba(255, 255, 255, 0.35)"}
                strokeWidth={3}
              />
            </Pressable>
          ) : null}
        </View>

        {/* Bottom Thumbnail Strip */}
        {images.length > 1 ? (
          <View style={styles.bottomBar}>
            <ScrollView
              ref={thumbnailScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbStripContent}
            >
              {images.map((uri, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <Pressable
                    key={`${uri}-${idx}`}
                    onPress={() => setCurrentIndex(idx)}
                    style={[
                      styles.thumbWrap,
                      isActive && styles.thumbWrapActive,
                      Platform.OS === "web" && ({ cursor: "pointer" } as any),
                    ]}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Go to photo ${idx + 1}`}
                  >
                    <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                    {isActive ? <View style={styles.thumbIndicator} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 15, 29, 0.97)",
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "ios" ? 54 : 32,
    paddingBottom: spacing.md,
    zIndex: 100,
  },
  topTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: spacing.md,
  },
  topTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    maxWidth: 240,
  },
  counterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  counterText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.85,
  },
  mainStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 12,
  },
  mainImage: {
    width: "100%",
    height: "100%",
    maxWidth: 950,
    maxHeight: 680,
    zIndex: 1,
  },
  errorPlaceholder: {
    width: 260,
    height: 180,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorPlaceholderText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  arrowBtn: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -26 }],
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  arrowBtnDisabled: {
    opacity: 0.28,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowOpacity: 0,
    elevation: 0,
  },
  arrowBtnPressed: {
    transform: [{ translateY: -26 }, { scale: 0.92 }],
    backgroundColor: "rgba(234, 88, 12, 0.9)",
    borderColor: "#EA580C",
  },
  leftArrow: {
    left: 16,
  },
  rightArrow: {
    right: 16,
  },
  bottomBar: {
    paddingVertical: 14,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    zIndex: 100,
  },
  thumbStripContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    alignItems: "center",
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    opacity: 0.6,
  },
  thumbWrapActive: {
    borderColor: "#EA580C",
    opacity: 1,
    transform: [{ scale: 1.08 }],
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbIndicator: {
    position: "absolute",
    bottom: 2,
    left: "50%",
    transform: [{ translateX: -3 }],
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EA580C",
  },
});

