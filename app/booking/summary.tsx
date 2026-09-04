import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Pencil } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Divider, Muted, SectionTitle, Title } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { DEFAULT_EVENT_CATEGORIES } from "@/src/constants/eventCategories";
import { formatDateLong, formatTime12h } from "@/src/utils/format";
import { colors, spacing } from "@/src/constants/theme";
import type { EventDay } from "@/src/types/booking";

function categoryLabel(id: string) {
  return DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

function DaySummary({ day }: { day: EventDay }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Title>Day {day.order}</Title>
        <Pressable onPress={() => router.push(`/booking/day/${day.dayId}`)} hitSlop={8}>
          <Pencil size={16} color={colors.primaryDark} />
        </Pressable>
      </View>
      <Muted>{day.eventTypeIds.map(categoryLabel).join(" + ") || "—"}</Muted>
      <Muted>
        {formatDateLong(day.eventDate)} · {formatTime12h(day.startTime)} – {formatTime12h(day.endTime)}
        {day.overnight ? " (+1 day)" : ""}
      </Muted>
      <Muted>{day.location.formattedAddress || "—"}</Muted>

      {day.photography.traditional || day.photography.candid ? (
        <Muted style={{ fontWeight: "700", color: colors.ink, marginTop: 4 }}>
          Photography: {day.photography.traditional ? `Traditional ${day.photography.traditionalCount}` : ""}
          {day.photography.traditional && day.photography.candid ? " · " : ""}
          {day.photography.candid ? `Candid ${day.photography.candidCount}` : ""}
        </Muted>
      ) : null}
      {day.videography.traditional || day.videography.candid ? (
        <Muted style={{ fontWeight: "700", color: colors.ink }}>
          Videography: {day.videography.traditional ? `Traditional ${day.videography.traditionalCount}` : ""}
          {day.videography.traditional && day.videography.candid ? " · " : ""}
          {day.videography.candid ? `Candid ${day.videography.candidCount}` : ""}
        </Muted>
      ) : null}
      {day.aerial.photographyDrones > 0 || day.aerial.videographyDrones > 0 ? (
        <Muted style={{ fontWeight: "700", color: colors.ink }}>
          Aerial: {day.aerial.photographyDrones > 0 ? `Photography ${day.aerial.photographyDrones} drone(s)` : ""}
          {day.aerial.photographyDrones > 0 && day.aerial.videographyDrones > 0 ? " · " : ""}
          {day.aerial.videographyDrones > 0 ? `Videography ${day.aerial.videographyDrones} drone(s)` : ""}
        </Muted>
      ) : null}
      {day.ledWall.enabled ? (
        <Muted style={{ fontWeight: "700", color: colors.ink }}>
          LED Wall: {day.ledWall.size} · {day.ledWall.screenCount} screen(s)
        </Muted>
      ) : null}
      {day.webLive.enabled ? <Muted style={{ fontWeight: "700", color: colors.ink }}>Web Live: {day.webLive.quality}</Muted> : null}
    </View>
  );
}

export default function BookingSummaryScreen() {
  const { activeDraft } = useAppStore();
  if (!activeDraft) return null;
  const days = [...activeDraft.days].sort((a, b) => a.order - b.order);
  const { photo, video } = activeDraft.deliverables;
  const editedPhotos = photo.editedPhotosOption === "custom" ? photo.editedPhotosCustomCount ?? 0 : photo.editedPhotosOption;
  const albumPages = photo.albumPagesOption === "custom" ? photo.albumPagesCustomCount ?? 0 : photo.albumPagesOption ?? "20";

  return (
    <WizardScreen title="Your requirements" step="deliverables" footer={<Button label="Continue to budget" onPress={() => router.push("/booking/budget")} flex={1} />}>
      <SectionTitle>
        {days.length} event day{days.length === 1 ? "" : "s"}
      </SectionTitle>
      {days.map((day, i) => (
        <Card key={day.dayId}>
          <DaySummary day={day} />
          {i < days.length - 1 ? <Divider /> : null}
        </Card>
      ))}

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <SectionTitle>Deliverables</SectionTitle>
          <Pressable onPress={() => router.push("/booking/deliverables")} hitSlop={8}>
            <Pencil size={16} color={colors.primaryDark} />
          </Pressable>
        </View>
        <Muted>Raw photos: {photo.rawPhotos ? "Yes" : "No"}</Muted>
        <Muted>Edited photos: {editedPhotos}</Muted>
        <Muted>Album: {photo.album ? `${albumPages} pages` : "No"}</Muted>
        <Muted>Raw video: {video.rawVideo ? "Yes" : "No"}</Muted>
        <Muted>Traditional videos: {video.editedTraditionalVideoCount}</Muted>
        <Muted>Cinematic videos: {video.editedCinematicVideoCount}</Muted>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <SectionTitle>Expected delivery</SectionTitle>
          <Pressable onPress={() => router.push("/booking/delivery-date")} hitSlop={8}>
            <Pencil size={16} color={colors.primaryDark} />
          </Pressable>
        </View>
        <Muted>{formatDateLong(activeDraft.expectedDeliveryDate)}</Muted>
      </Card>
    </WizardScreen>
  );
}
