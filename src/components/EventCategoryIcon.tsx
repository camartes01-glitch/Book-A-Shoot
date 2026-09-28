import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import {
  Sparkles,
  Heart,
  Baby,
  Flame,
  Home,
  Users,
  Gift,
  Building2,
  Briefcase,
  ShoppingBag,
  Camera,
  Utensils,
  Video,
  Sun,
  Music,
  Gem,
  Crown,
  PartyPopper,
  Palette,
  Tv,
  Megaphone,
  Award,
} from "lucide-react-native";
import { colors } from "@/src/constants/theme";

export function WeddingRingIcon({ size = 20, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="8.5" cy="13.5" r="5" stroke={color} strokeWidth="1.9" />
      <Circle cx="15.5" cy="11.5" r="5" stroke={color} strokeWidth="1.9" />
      <Path d="M15.5 5.5L16.5 4.5" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    </Svg>
  );
}

export function CoupleIcon({ size = 20, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="8" cy="7" r="3" stroke={color} strokeWidth="1.8" />
      <Circle cx="16" cy="7.5" r="2.8" stroke={color} strokeWidth="1.8" />
      <Path
        d="M3.5 19c0-3 2.5-4.8 5-4.8s3.8 1.4 4.5 3M13.5 17c.5-2 2.2-3.8 4.5-3.8s3.5 1.5 3.5 4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BabyFaceIcon({ size = 20, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12.5" r="7" stroke={color} strokeWidth="1.8" />
      <Circle cx="9.5" cy="12" r="0.9" fill={color} />
      <Circle cx="14.5" cy="12" r="0.9" fill={color} />
      <Path d="M10.2 15c.6.6 1.1.8 1.8.8s1.2-.2 1.8-.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M12 5.5c-.8-1.5-2-1.5-2-1.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function BirthdayCakeIcon({ size = 20, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 19v-4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" stroke={color} strokeWidth="1.8" />
      <Path d="M7 13V9.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2V13" stroke={color} strokeWidth="1.8" />
      <Path d="M9 7.5V4M12 7.5V4M15 7.5V4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M3 20h18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Returns the corresponding vector icon for any event category.
 * Default color is strictly Book A Shoot orange (colors.primary).
 */
export function getEventIcon(id: string, size = 20, color = colors.primary): React.ReactElement {
  switch (id) {
    case "wedding":
      return <WeddingRingIcon size={size} color={color} />;
    case "pre_wedding":
    case "post_wedding":
      return <CoupleIcon size={size} color={color} />;
    case "engagement":
      return <Gem size={size} color={color} />;
    case "haldi":
      return <Sun size={size} color={color} />;
    case "mehendi":
    case "mehndi":
      return <Palette size={size} color={color} />;
    case "sangeeth":
      return <Music size={size} color={color} />;
    case "groom_making":
      return <Crown size={size} color={color} />;
    case "bride_making":
      return <Sparkles size={size} color={color} />;
    case "reception":
      return <PartyPopper size={size} color={color} />;

    case "birthday":
      return <BirthdayCakeIcon size={size} color={color} />;
    case "baby_shoot":
      return <BabyFaceIcon size={size} color={color} />;
    case "maternity_shoot":
      return <Heart size={size} color={color} />;
    case "naming_ceremony":
      return <Award size={size} color={color} />;
    case "housewarming":
      return <Home size={size} color={color} />;
    case "anniversary":
      return <Gift size={size} color={color} />;
    case "get_together":
      return <Users size={size} color={color} />;
    case "personal_other":
      return <Sparkles size={size} color={color} />;

    case "pooja":
    case "ganesh_pooja":
    case "satyanarayan_pooja":
    case "gruha_pravesh_pooja":
    case "lakshmi_pooja":
    case "saraswati_pooja":
    case "navratri_pooja":
    case "diwali_pooja":
    case "durga_pooja":
    case "varalakshmi_vratham":
    case "naming_ceremony_pooja":
    case "wedding_pooja":
    case "other_pooja":
      return <Flame size={size} color={color} />;

    case "corporate_event":
      return <Building2 size={size} color={color} />;
    case "brand_event":
      return <Megaphone size={size} color={color} />;
    case "product_shoot":
      return <ShoppingBag size={size} color={color} />;
    case "fashion_shoot":
      return <Camera size={size} color={color} />;
    case "advertising_shoot":
      return <Tv size={size} color={color} />;
    case "real_estate_shoot":
      return <Home size={size} color={color} />;
    case "food_photography":
      return <Utensils size={size} color={color} />;
    case "commercial_other":
      return <Briefcase size={size} color={color} />;

    case "drone":
      return <Video size={size} color={color} />;
    case "led_wall":
      return <Tv size={size} color={color} />;

    default:
      return <Sparkles size={size} color={color} />;
  }
}
