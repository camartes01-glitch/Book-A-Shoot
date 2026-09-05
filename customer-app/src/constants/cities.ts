/** Fallback location dataset used only when no Google Places API key is
 * configured (see `src/services/placesApi.ts`). Covers major Indian cities
 * so the location picker works out of the box; swap for live Places
 * Autocomplete by setting EXPO_PUBLIC_GOOGLE_PLACES_API_KEY. */
export type CityRecord = {
  city: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  pincode: string;
};

export const INDIAN_CITIES: CityRecord[] = [
  { city: "Tirupati", district: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lng: 79.4192, pincode: "517501" },
  { city: "Hyderabad", district: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, pincode: "500001" },
  { city: "Secunderabad", district: "Hyderabad", state: "Telangana", lat: 17.4399, lng: 78.4983, pincode: "500003" },
  { city: "Bengaluru", district: "Bengaluru Urban", state: "Karnataka", lat: 12.9716, lng: 77.5946, pincode: "560001" },
  { city: "Chennai", district: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, pincode: "600001" },
  { city: "Mumbai", district: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777, pincode: "400001" },
  { city: "Pune", district: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, pincode: "411001" },
  { city: "Delhi", district: "New Delhi", state: "Delhi", lat: 28.6139, lng: 77.209, pincode: "110001" },
  { city: "Vijayawada", district: "NTR", state: "Andhra Pradesh", lat: 16.5062, lng: 80.648, pincode: "520001" },
  { city: "Visakhapatnam", district: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185, pincode: "530001" },
  { city: "Kurnool", district: "Kurnool", state: "Andhra Pradesh", lat: 15.8281, lng: 78.0373, pincode: "518001" },
  { city: "Kolkata", district: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, pincode: "700001" },
  { city: "Ahmedabad", district: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, pincode: "380001" },
  { city: "Jaipur", district: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, pincode: "302001" },
  { city: "Lucknow", district: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, pincode: "226001" },
  { city: "Coimbatore", district: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558, pincode: "641001" },
  { city: "Kochi", district: "Ernakulam", state: "Kerala", lat: 9.9312, lng: 76.2673, pincode: "682001" },
  { city: "Warangal", district: "Warangal", state: "Telangana", lat: 17.9689, lng: 79.5941, pincode: "506002" },
];

export function findCity(query: string): CityRecord[] {
  const key = query.trim().toLowerCase();
  if (!key) return INDIAN_CITIES;
  return INDIAN_CITIES.filter(
    (c) => c.city.toLowerCase().includes(key) || c.district.toLowerCase().includes(key) || c.state.toLowerCase().includes(key),
  );
}

export function nearestCity(lat: number, lng: number): CityRecord {
  let best = INDIAN_CITIES[0];
  let bestDist = Infinity;
  for (const c of INDIAN_CITIES) {
    const d = Math.hypot(c.lat - lat, c.lng - lng);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}
