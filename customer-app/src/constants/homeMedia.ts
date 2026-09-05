import type { ImageSourcePropType } from "react-native";

/** Local media for the Home screen (spec section 53 "What are you planning?").
 * Bundled + compressed JPEGs so the app works fully offline with no CDN
 * dependency; swap for real Camartes/vendor portfolio photos once a media
 * CDN is wired up. */
export const HOME_HERO_IMAGE: ImageSourcePropType = require("@/assets/images/home/home_hero_wedding.jpg");

export const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  wedding: require("@/assets/images/home/category_wedding.jpg"),
  pre_wedding: require("@/assets/images/home/category_pre_wedding.jpg"),
  birthday: require("@/assets/images/home/category_birthday.jpg"),
  baby_shoot: require("@/assets/images/home/category_baby_shoot.jpg"),
  corporate_event: require("@/assets/images/home/category_corporate.jpg"),
};

export const PORTFOLIO_STRIP: Array<{ id: string; label: string; image: ImageSourcePropType }> = [
  { id: "mehndi", label: "Mehndi & Traditions", image: require("@/assets/images/home/portfolio_mehndi.jpg") },
  { id: "drone", label: "Aerial Coverage", image: require("@/assets/images/home/portfolio_drone.jpg") },
  { id: "led_wall", label: "Live Stage Events", image: require("@/assets/images/home/portfolio_led_wall.jpg") },
];
