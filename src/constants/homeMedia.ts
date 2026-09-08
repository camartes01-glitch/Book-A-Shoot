import type { ImageSourcePropType } from "react-native";

/** Local media for marketplace discovery. Bundled JPEGs — no random stock CDN. */
export const HOME_HERO_IMAGE: ImageSourcePropType = require("@/assets/images/home/home_hero_wedding.jpg");

export const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  wedding: require("@/assets/images/home/category_wedding.jpg"),
  engagement: require("@/assets/images/home/category_wedding.jpg"),
  pre_wedding: require("@/assets/images/home/category_pre_wedding.jpg"),
  post_wedding: require("@/assets/images/home/category_pre_wedding.jpg"),
  reception: require("@/assets/images/home/category_wedding.jpg"),
  haldi: require("@/assets/images/home/portfolio_mehndi.jpg"),
  mehendi: require("@/assets/images/home/portfolio_mehndi.jpg"),
  birthday: require("@/assets/images/home/category_birthday.jpg"),
  baby_shoot: require("@/assets/images/home/category_baby_shoot.jpg"),
  maternity_shoot: require("@/assets/images/home/category_baby_shoot.jpg"),
  anniversary: require("@/assets/images/home/category_birthday.jpg"),
  naming_ceremony: require("@/assets/images/home/category_baby_shoot.jpg"),
  housewarming: require("@/assets/images/home/category_corporate.jpg"),
  corporate_event: require("@/assets/images/home/category_corporate.jpg"),
  product_shoot: require("@/assets/images/home/category_corporate.jpg"),
  brand_event: require("@/assets/images/home/category_corporate.jpg"),
  pooja: require("@/assets/images/home/portfolio_mehndi.jpg"),
  ganesh_pooja: require("@/assets/images/home/portfolio_mehndi.jpg"),
  satyanarayan_pooja: require("@/assets/images/home/portfolio_mehndi.jpg"),
  gruha_pravesh_pooja: require("@/assets/images/home/portfolio_mehndi.jpg"),
  lakshmi_pooja: require("@/assets/images/home/portfolio_mehndi.jpg"),
  saraswati_pooja: require("@/assets/images/home/portfolio_mehndi.jpg"),
  navratri_pooja: require("@/assets/images/home/portfolio_mehndi.jpg"),
  diwali_pooja: require("@/assets/images/home/portfolio_mehndi.jpg"),
  durga_pooja: require("@/assets/images/home/portfolio_mehndi.jpg"),
  varalakshmi_vratham: require("@/assets/images/home/portfolio_mehndi.jpg"),
  naming_ceremony_pooja: require("@/assets/images/home/portfolio_mehndi.jpg"),
  wedding_pooja: require("@/assets/images/home/portfolio_mehndi.jpg"),
  other_pooja: require("@/assets/images/home/portfolio_mehndi.jpg"),
};

export function categoryImageFor(id: string): ImageSourcePropType {
  return CATEGORY_IMAGES[id] ?? CATEGORY_IMAGES.wedding;
}

export const PORTFOLIO_STRIP: Array<{ id: string; label: string; image: ImageSourcePropType }> = [
  { id: "mehndi", label: "Mehndi & traditions", image: require("@/assets/images/home/portfolio_mehndi.jpg") },
  { id: "drone", label: "Aerial coverage", image: require("@/assets/images/home/portfolio_drone.jpg") },
  { id: "led_wall", label: "Live stage events", image: require("@/assets/images/home/portfolio_led_wall.jpg") },
];

export const SEARCH_EXAMPLES = [
  "Wedding photographer",
  "Birthday photography",
  "Pre-wedding shoot",
  "Corporate event",
  "Baby shoot",
  "Pooja",
];
