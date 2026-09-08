import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Camera, Video } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Field, Muted, SectionTitle } from "@/src/components/ui";
import { Chip, ChipGroup } from "@/src/components/Chip";
import { ToggleRow } from "@/src/components/ToggleRow";
import { Stepper } from "@/src/components/Stepper";
import { useAppStore } from "@/src/state/AppProvider";
import { ALBUM_PAGE_OPTIONS, EDITED_PHOTO_OPTIONS } from "@/src/constants/limits";
import type { Deliverables } from "@/src/types/booking";
import { colors, spacing } from "@/src/constants/theme";

export default function DeliverablesScreen() {
  const { activeDraft, updateDeliverables } = useAppStore();
  const [d, setD] = useState<Deliverables | null>(activeDraft?.deliverables ?? null);

  // See the day editor screen for why these need to be refs: the
  // useFocusEffect callback below is only created once (stable deps), so
  // reading `activeDraft`/`updateDeliverables` directly would freeze them at
  // whatever they were on first mount instead of picking up later updates.
  const activeDraftRef = useRef(activeDraft);
  const updateDeliverablesRef = useRef(updateDeliverables);
  const dRef = useRef<Deliverables | null>(d);

  useEffect(() => {
    activeDraftRef.current = activeDraft;
  }, [activeDraft]);
  useEffect(() => {
    updateDeliverablesRef.current = updateDeliverables;
  }, [updateDeliverables]);
  useEffect(() => {
    dRef.current = d;
  }, [d]);

  // Save on blur/unmount (see the day editor for why a timer-based debounce
  // was replaced with this pattern).
  useFocusEffect(
    useCallback(() => {
      if (activeDraftRef.current) {
        setD(activeDraftRef.current.deliverables);
        dRef.current = activeDraftRef.current.deliverables;
      }
      return () => {
        if (dRef.current) void updateDeliverablesRef.current(dRef.current);
      };
    }, []),
  );

  if (!d) return null;

  const patchPhoto = (p: Partial<Deliverables["photo"]>) => setD((prev) => (prev ? { ...prev, photo: { ...prev.photo, ...p } } : prev));
  const patchVideo = (p: Partial<Deliverables["video"]>) => setD((prev) => (prev ? { ...prev, video: { ...prev.video, ...p } } : prev));

  const onContinue = () => {
    if (d) void updateDeliverables(d);
    router.push("/booking/delivery-date");
  };

  return (
    <WizardScreen title="What you'll receive" step="services" footer={<Button label="Continue" onPress={onContinue} flex={1} />}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Camera size={18} color={colors.primaryDark} />
          <SectionTitle>Photos</SectionTitle>
        </View>
        <ToggleRow label="Raw photos" description="Unedited files from the shoot" value={d.photo.rawPhotos} onValueChange={(v) => patchPhoto({ rawPhotos: v })} />

        <Muted style={{ fontWeight: "700", color: colors.ink }}>Edited photos</Muted>
        <ChipGroup>
          {EDITED_PHOTO_OPTIONS.map((opt) => (
            <Chip key={opt} label={opt} selected={d.photo.editedPhotosOption === opt} onPress={() => patchPhoto({ editedPhotosOption: opt })} />
          ))}
          <Chip label="Custom" selected={d.photo.editedPhotosOption === "custom"} onPress={() => patchPhoto({ editedPhotosOption: "custom" })} />
        </ChipGroup>
        {d.photo.editedPhotosOption === "custom" ? (
          <Field
            label="Number of edited photos"
            keyboardType="number-pad"
            value={d.photo.editedPhotosCustomCount != null ? String(d.photo.editedPhotosCustomCount) : ""}
            onChangeText={(v) => patchPhoto({ editedPhotosCustomCount: parseInt(v, 10) || 0 })}
          />
        ) : null}

        <ToggleRow
          label="Album"
          description="Printed photo album"
          value={d.photo.album}
          onValueChange={(v) => patchPhoto({ album: v, albumPagesOption: v && !d.photo.albumPagesOption ? "20" : d.photo.albumPagesOption })}
        />
        {d.photo.album ? (
          <View style={{ gap: spacing.sm }}>
            <Muted style={{ fontWeight: "700", color: colors.ink }}>Album pages</Muted>
            <ChipGroup>
              {ALBUM_PAGE_OPTIONS.map((opt) => (
                <Chip key={opt} label={opt} selected={d.photo.albumPagesOption === opt} onPress={() => patchPhoto({ albumPagesOption: opt })} />
              ))}
              <Chip label="Custom" selected={d.photo.albumPagesOption === "custom"} onPress={() => patchPhoto({ albumPagesOption: "custom" })} />
            </ChipGroup>
            {d.photo.albumPagesOption === "custom" ? (
              <Field
                label="Number of pages"
                keyboardType="number-pad"
                value={d.photo.albumPagesCustomCount != null ? String(d.photo.albumPagesCustomCount) : ""}
                onChangeText={(v) => patchPhoto({ albumPagesCustomCount: parseInt(v, 10) || 0 })}
              />
            ) : null}
          </View>
        ) : null}
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Video size={18} color={colors.primaryDark} />
          <SectionTitle>Video</SectionTitle>
        </View>
        <ToggleRow label="Raw video" description="Unedited footage from the shoot" value={d.video.rawVideo} onValueChange={(v) => patchVideo({ rawVideo: v })} />
        <Stepper
          label="Edited traditional videos"
          value={d.video.editedTraditionalVideoCount}
          min={0}
          max={10}
          onChange={(n) => patchVideo({ editedTraditionalVideoCount: n })}
        />
        <Stepper
          label="Edited cinematic videos"
          value={d.video.editedCinematicVideoCount}
          min={0}
          max={10}
          onChange={(n) => patchVideo({ editedCinematicVideoCount: n })}
        />
      </Card>
    </WizardScreen>
  );
}
