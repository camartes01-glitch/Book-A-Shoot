/**
 * Indian "service cities" — the city names photographers register under and
 * the unit every booking request is dispatched by.
 *
 * Used to:
 *  1. Snap any coordinate (an area, suburb, venue, village on the city's edge)
 *     to the city it belongs to, e.g. Kanuru / Benz Circle / Poranki →
 *     Vijayawada (NTR District); Gachibowli / Kukatpally → Hyderabad.
 *     Reverse geocoders (Android, OSM, Google) often report a municipality or
 *     neighbourhood as the "city", which matched zero photographers.
 *  2. Offline city search when no network geocoder is reachable.
 *
 * `radiusKm` is the metro catchment measured from the city centre. When a point
 * falls inside several catchments, the nearest centre wins, so neighbouring
 * cities (Guntur vs Vijayawada, Thane vs Mumbai) resolve correctly.
 */
export type CityRecord = {
  city: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  pincode: string;
  /** Metro catchment radius from the centre, in km. */
  radiusKm?: number;
  /** Alternate / historical names and twin cities that mean this city. */
  aliases?: string[];
};

const DEFAULT_RADIUS_KM = 15;

export const INDIAN_CITIES: CityRecord[] = [
  // ── Andhra Pradesh ────────────────────────────────────────────────
  { city: "Vijayawada", district: "NTR District", state: "Andhra Pradesh", lat: 16.5062, lng: 80.648, pincode: "520001", radiusKm: 18, aliases: ["Bezawada", "Vijayavada"] },
  { city: "Visakhapatnam", district: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185, pincode: "530001", radiusKm: 25, aliases: ["Vizag", "Vishakhapatnam", "Waltair"] },
  { city: "Guntur", district: "Guntur", state: "Andhra Pradesh", lat: 16.3067, lng: 80.4365, pincode: "522001", radiusKm: 14 },
  { city: "Amaravati", district: "Guntur", state: "Andhra Pradesh", lat: 16.5131, lng: 80.5165, pincode: "522020", radiusKm: 6 },
  { city: "Tirupati", district: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lng: 79.4192, pincode: "517501", radiusKm: 14, aliases: ["Tirumala"] },
  { city: "Nellore", district: "SPSR Nellore", state: "Andhra Pradesh", lat: 14.4426, lng: 79.9865, pincode: "524001", radiusKm: 12 },
  { city: "Rajahmundry", district: "East Godavari", state: "Andhra Pradesh", lat: 17.0005, lng: 81.804, pincode: "533101", radiusKm: 12, aliases: ["Rajamahendravaram", "Rajamundry"] },
  { city: "Kakinada", district: "Kakinada", state: "Andhra Pradesh", lat: 16.9891, lng: 82.2475, pincode: "533001", radiusKm: 12 },
  { city: "Eluru", district: "Eluru", state: "Andhra Pradesh", lat: 16.7107, lng: 81.0952, pincode: "534001", radiusKm: 10 },
  { city: "Ongole", district: "Prakasam", state: "Andhra Pradesh", lat: 15.5057, lng: 80.0499, pincode: "523001", radiusKm: 10 },
  { city: "Kurnool", district: "Kurnool", state: "Andhra Pradesh", lat: 15.8281, lng: 78.0373, pincode: "518001", radiusKm: 12 },
  { city: "Kadapa", district: "YSR Kadapa", state: "Andhra Pradesh", lat: 14.4673, lng: 78.8242, pincode: "516001", radiusKm: 10, aliases: ["Cuddapah"] },
  { city: "Anantapur", district: "Anantapur", state: "Andhra Pradesh", lat: 14.6819, lng: 77.6006, pincode: "515001", radiusKm: 10, aliases: ["Anantapuram"] },
  { city: "Machilipatnam", district: "Krishna", state: "Andhra Pradesh", lat: 16.1875, lng: 81.1389, pincode: "521001", radiusKm: 9, aliases: ["Bandar"] },
  { city: "Bhimavaram", district: "West Godavari", state: "Andhra Pradesh", lat: 16.5449, lng: 81.5212, pincode: "534201", radiusKm: 9 },
  { city: "Vizianagaram", district: "Vizianagaram", state: "Andhra Pradesh", lat: 18.1067, lng: 83.3956, pincode: "535001", radiusKm: 9 },
  { city: "Srikakulam", district: "Srikakulam", state: "Andhra Pradesh", lat: 18.2949, lng: 83.8938, pincode: "532001", radiusKm: 9 },
  { city: "Chittoor", district: "Chittoor", state: "Andhra Pradesh", lat: 13.2172, lng: 79.1003, pincode: "517001", radiusKm: 9 },
  { city: "Nandyal", district: "Nandyal", state: "Andhra Pradesh", lat: 15.4786, lng: 78.4831, pincode: "518501", radiusKm: 9 },
  { city: "Tenali", district: "Guntur", state: "Andhra Pradesh", lat: 16.2428, lng: 80.64, pincode: "522201", radiusKm: 7 },
  { city: "Proddatur", district: "YSR Kadapa", state: "Andhra Pradesh", lat: 14.7502, lng: 78.5481, pincode: "516360", radiusKm: 8 },
  { city: "Hindupur", district: "Sri Sathya Sai", state: "Andhra Pradesh", lat: 13.8289, lng: 77.4911, pincode: "515201", radiusKm: 8 },
  { city: "Narasaraopet", district: "Palnadu", state: "Andhra Pradesh", lat: 16.2346, lng: 80.0479, pincode: "522601", radiusKm: 8 },
  { city: "Gudivada", district: "Krishna", state: "Andhra Pradesh", lat: 16.4352, lng: 80.9956, pincode: "521301", radiusKm: 7 },

  // ── Telangana ─────────────────────────────────────────────────────
  {
    city: "Hyderabad",
    district: "Hyderabad",
    state: "Telangana",
    lat: 17.385,
    lng: 78.4867,
    pincode: "500001",
    radiusKm: 35,
    aliases: ["Secunderabad", "Cyberabad", "Hyd", "Hitech City", "HITEC City", "Gachibowli", "Kukatpally", "Madhapur", "Kondapur", "Miyapur", "LB Nagar", "Uppal", "Shamshabad", "Rangareddy", "Ranga Reddy", "Medchal", "Medchal-Malkajgiri", "Malkajgiri"],
  },
  { city: "Warangal", district: "Hanumakonda", state: "Telangana", lat: 17.9689, lng: 79.5941, pincode: "506002", radiusKm: 14, aliases: ["Hanamkonda", "Hanumakonda", "Kazipet"] },
  { city: "Karimnagar", district: "Karimnagar", state: "Telangana", lat: 18.4386, lng: 79.1288, pincode: "505001", radiusKm: 10 },
  { city: "Nizamabad", district: "Nizamabad", state: "Telangana", lat: 18.6725, lng: 78.094, pincode: "503001", radiusKm: 10 },
  { city: "Khammam", district: "Khammam", state: "Telangana", lat: 17.2473, lng: 80.1514, pincode: "507001", radiusKm: 10 },
  { city: "Nalgonda", district: "Nalgonda", state: "Telangana", lat: 17.0575, lng: 79.2671, pincode: "508001", radiusKm: 8 },
  { city: "Mahbubnagar", district: "Mahabubnagar", state: "Telangana", lat: 16.7488, lng: 78.0035, pincode: "509001", radiusKm: 8, aliases: ["Mahabubnagar", "Palamuru"] },
  { city: "Siddipet", district: "Siddipet", state: "Telangana", lat: 18.1018, lng: 78.852, pincode: "502103", radiusKm: 8 },
  { city: "Suryapet", district: "Suryapet", state: "Telangana", lat: 17.1405, lng: 79.6236, pincode: "508213", radiusKm: 7 },
  { city: "Adilabad", district: "Adilabad", state: "Telangana", lat: 19.6641, lng: 78.532, pincode: "504001", radiusKm: 7 },
  { city: "Ramagundam", district: "Peddapalli", state: "Telangana", lat: 18.7557, lng: 79.474, pincode: "505208", radiusKm: 9, aliases: ["Godavarikhani"] },
  { city: "Mancherial", district: "Mancherial", state: "Telangana", lat: 18.8679, lng: 79.4639, pincode: "504208", radiusKm: 7 },
  { city: "Sangareddy", district: "Sangareddy", state: "Telangana", lat: 17.6248, lng: 78.0867, pincode: "502001", radiusKm: 7 },

  // ── Karnataka ─────────────────────────────────────────────────────
  { city: "Bengaluru", district: "Bengaluru Urban", state: "Karnataka", lat: 12.9716, lng: 77.5946, pincode: "560001", radiusKm: 35, aliases: ["Bangalore", "Bangaluru", "Whitefield", "Electronic City"] },
  { city: "Mysuru", district: "Mysuru", state: "Karnataka", lat: 12.2958, lng: 76.6394, pincode: "570001", radiusKm: 14, aliases: ["Mysore"] },
  { city: "Mangaluru", district: "Dakshina Kannada", state: "Karnataka", lat: 12.9141, lng: 74.856, pincode: "575001", radiusKm: 14, aliases: ["Mangalore"] },
  { city: "Hubballi", district: "Dharwad", state: "Karnataka", lat: 15.3647, lng: 75.124, pincode: "580020", radiusKm: 12, aliases: ["Hubli", "Hubli-Dharwad"] },
  { city: "Dharwad", district: "Dharwad", state: "Karnataka", lat: 15.4589, lng: 75.0078, pincode: "580001", radiusKm: 8 },
  { city: "Belagavi", district: "Belagavi", state: "Karnataka", lat: 15.8497, lng: 74.4977, pincode: "590001", radiusKm: 12, aliases: ["Belgaum"] },
  { city: "Kalaburagi", district: "Kalaburagi", state: "Karnataka", lat: 17.3297, lng: 76.8343, pincode: "585101", radiusKm: 10, aliases: ["Gulbarga"] },
  { city: "Davanagere", district: "Davanagere", state: "Karnataka", lat: 14.4644, lng: 75.9218, pincode: "577001", radiusKm: 9 },
  { city: "Ballari", district: "Ballari", state: "Karnataka", lat: 15.1394, lng: 76.9214, pincode: "583101", radiusKm: 9, aliases: ["Bellary"] },
  { city: "Shivamogga", district: "Shivamogga", state: "Karnataka", lat: 13.9299, lng: 75.5681, pincode: "577201", radiusKm: 9, aliases: ["Shimoga"] },
  { city: "Tumakuru", district: "Tumakuru", state: "Karnataka", lat: 13.3379, lng: 77.1173, pincode: "572101", radiusKm: 9, aliases: ["Tumkur"] },
  { city: "Udupi", district: "Udupi", state: "Karnataka", lat: 13.3409, lng: 74.7421, pincode: "576101", radiusKm: 9, aliases: ["Manipal"] },

  // ── Tamil Nadu ────────────────────────────────────────────────────
  { city: "Chennai", district: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, pincode: "600001", radiusKm: 35, aliases: ["Madras"] },
  { city: "Coimbatore", district: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558, pincode: "641001", radiusKm: 18, aliases: ["Kovai"] },
  { city: "Madurai", district: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198, pincode: "625001", radiusKm: 14 },
  { city: "Tiruchirappalli", district: "Tiruchirappalli", state: "Tamil Nadu", lat: 10.7905, lng: 78.7047, pincode: "620001", radiusKm: 14, aliases: ["Trichy", "Tiruchi"] },
  { city: "Salem", district: "Salem", state: "Tamil Nadu", lat: 11.6643, lng: 78.146, pincode: "636001", radiusKm: 12 },
  { city: "Tirunelveli", district: "Tirunelveli", state: "Tamil Nadu", lat: 8.7139, lng: 77.7567, pincode: "627001", radiusKm: 10 },
  { city: "Tiruppur", district: "Tiruppur", state: "Tamil Nadu", lat: 11.1085, lng: 77.3411, pincode: "641601", radiusKm: 10, aliases: ["Tirupur"] },
  { city: "Vellore", district: "Vellore", state: "Tamil Nadu", lat: 12.9165, lng: 79.1325, pincode: "632001", radiusKm: 10 },
  { city: "Erode", district: "Erode", state: "Tamil Nadu", lat: 11.341, lng: 77.7172, pincode: "638001", radiusKm: 10 },
  { city: "Thoothukudi", district: "Thoothukudi", state: "Tamil Nadu", lat: 8.7642, lng: 78.1348, pincode: "628001", radiusKm: 9, aliases: ["Tuticorin"] },
  { city: "Thanjavur", district: "Thanjavur", state: "Tamil Nadu", lat: 10.787, lng: 79.1378, pincode: "613001", radiusKm: 9, aliases: ["Tanjore"] },
  { city: "Puducherry", district: "Puducherry", state: "Puducherry", lat: 11.9416, lng: 79.8083, pincode: "605001", radiusKm: 12, aliases: ["Pondicherry", "Pondy"] },

  // ── Kerala ────────────────────────────────────────────────────────
  { city: "Kochi", district: "Ernakulam", state: "Kerala", lat: 9.9312, lng: 76.2673, pincode: "682001", radiusKm: 18, aliases: ["Cochin", "Ernakulam"] },
  { city: "Thiruvananthapuram", district: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366, pincode: "695001", radiusKm: 15, aliases: ["Trivandrum"] },
  { city: "Kozhikode", district: "Kozhikode", state: "Kerala", lat: 11.2588, lng: 75.7804, pincode: "673001", radiusKm: 13, aliases: ["Calicut"] },
  { city: "Thrissur", district: "Thrissur", state: "Kerala", lat: 10.5276, lng: 76.2144, pincode: "680001", radiusKm: 12, aliases: ["Trichur"] },
  { city: "Kollam", district: "Kollam", state: "Kerala", lat: 8.8932, lng: 76.6141, pincode: "691001", radiusKm: 10, aliases: ["Quilon"] },
  { city: "Kannur", district: "Kannur", state: "Kerala", lat: 11.8745, lng: 75.3704, pincode: "670001", radiusKm: 10, aliases: ["Cannanore"] },

  // ── Maharashtra & Goa ─────────────────────────────────────────────
  { city: "Mumbai", district: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777, pincode: "400001", radiusKm: 30, aliases: ["Bombay", "Andheri", "Bandra"] },
  { city: "Thane", district: "Thane", state: "Maharashtra", lat: 19.2183, lng: 72.9781, pincode: "400601", radiusKm: 12 },
  { city: "Navi Mumbai", district: "Thane", state: "Maharashtra", lat: 19.033, lng: 73.0297, pincode: "400703", radiusKm: 12, aliases: ["Vashi", "Panvel"] },
  { city: "Pune", district: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, pincode: "411001", radiusKm: 25, aliases: ["Poona", "Pimpri-Chinchwad", "Pimpri Chinchwad", "Hinjewadi"] },
  { city: "Nagpur", district: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882, pincode: "440001", radiusKm: 18 },
  { city: "Nashik", district: "Nashik", state: "Maharashtra", lat: 19.9975, lng: 73.7898, pincode: "422001", radiusKm: 14, aliases: ["Nasik"] },
  { city: "Chhatrapati Sambhajinagar", district: "Chhatrapati Sambhajinagar", state: "Maharashtra", lat: 19.8762, lng: 75.3433, pincode: "431001", radiusKm: 14, aliases: ["Aurangabad"] },
  { city: "Solapur", district: "Solapur", state: "Maharashtra", lat: 17.6599, lng: 75.9064, pincode: "413001", radiusKm: 11 },
  { city: "Kolhapur", district: "Kolhapur", state: "Maharashtra", lat: 16.705, lng: 74.2433, pincode: "416001", radiusKm: 11 },
  { city: "Amravati", district: "Amravati", state: "Maharashtra", lat: 20.9374, lng: 77.7796, pincode: "444601", radiusKm: 10 },
  { city: "Nanded", district: "Nanded", state: "Maharashtra", lat: 19.1383, lng: 77.321, pincode: "431601", radiusKm: 9 },
  { city: "Panaji", district: "North Goa", state: "Goa", lat: 15.4909, lng: 73.8278, pincode: "403001", radiusKm: 15, aliases: ["Goa", "Panjim"] },
  { city: "Margao", district: "South Goa", state: "Goa", lat: 15.2832, lng: 73.9862, pincode: "403601", radiusKm: 12, aliases: ["Madgaon", "Vasco da Gama"] },

  // ── Gujarat ───────────────────────────────────────────────────────
  { city: "Ahmedabad", district: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, pincode: "380001", radiusKm: 25, aliases: ["Amdavad"] },
  { city: "Gandhinagar", district: "Gandhinagar", state: "Gujarat", lat: 23.2156, lng: 72.6369, pincode: "382010", radiusKm: 10 },
  { city: "Surat", district: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311, pincode: "395003", radiusKm: 20 },
  { city: "Vadodara", district: "Vadodara", state: "Gujarat", lat: 22.3072, lng: 73.1812, pincode: "390001", radiusKm: 15, aliases: ["Baroda"] },
  { city: "Rajkot", district: "Rajkot", state: "Gujarat", lat: 22.3039, lng: 70.8022, pincode: "360001", radiusKm: 14 },
  { city: "Bhavnagar", district: "Bhavnagar", state: "Gujarat", lat: 21.7645, lng: 72.1519, pincode: "364001", radiusKm: 10 },
  { city: "Jamnagar", district: "Jamnagar", state: "Gujarat", lat: 22.4707, lng: 70.0577, pincode: "361001", radiusKm: 10 },

  // ── Delhi NCR ─────────────────────────────────────────────────────
  { city: "Delhi", district: "New Delhi", state: "Delhi", lat: 28.6139, lng: 77.209, pincode: "110001", radiusKm: 25, aliases: ["New Delhi", "NCR", "Dilli"] },
  { city: "Gurugram", district: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266, pincode: "122001", radiusKm: 15, aliases: ["Gurgaon"] },
  { city: "Noida", district: "Gautam Buddh Nagar", state: "Uttar Pradesh", lat: 28.5355, lng: 77.391, pincode: "201301", radiusKm: 14, aliases: ["Greater Noida"] },
  { city: "Ghaziabad", district: "Ghaziabad", state: "Uttar Pradesh", lat: 28.6692, lng: 77.4538, pincode: "201001", radiusKm: 12 },
  { city: "Faridabad", district: "Faridabad", state: "Haryana", lat: 28.4089, lng: 77.3178, pincode: "121001", radiusKm: 12 },

  // ── North India ───────────────────────────────────────────────────
  { city: "Jaipur", district: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, pincode: "302001", radiusKm: 20, aliases: ["Pink City"] },
  { city: "Jodhpur", district: "Jodhpur", state: "Rajasthan", lat: 26.2389, lng: 73.0243, pincode: "342001", radiusKm: 13 },
  { city: "Udaipur", district: "Udaipur", state: "Rajasthan", lat: 24.5854, lng: 73.7125, pincode: "313001", radiusKm: 13 },
  { city: "Kota", district: "Kota", state: "Rajasthan", lat: 25.2138, lng: 75.8648, pincode: "324001", radiusKm: 12 },
  { city: "Ajmer", district: "Ajmer", state: "Rajasthan", lat: 26.4499, lng: 74.6399, pincode: "305001", radiusKm: 10 },
  { city: "Bikaner", district: "Bikaner", state: "Rajasthan", lat: 28.0229, lng: 73.3119, pincode: "334001", radiusKm: 10 },
  { city: "Lucknow", district: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, pincode: "226001", radiusKm: 20 },
  { city: "Kanpur", district: "Kanpur Nagar", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319, pincode: "208001", radiusKm: 16 },
  { city: "Agra", district: "Agra", state: "Uttar Pradesh", lat: 27.1767, lng: 78.0081, pincode: "282001", radiusKm: 14 },
  { city: "Varanasi", district: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, pincode: "221001", radiusKm: 14, aliases: ["Banaras", "Benares", "Kashi"] },
  { city: "Prayagraj", district: "Prayagraj", state: "Uttar Pradesh", lat: 25.4358, lng: 81.8463, pincode: "211001", radiusKm: 14, aliases: ["Allahabad"] },
  { city: "Meerut", district: "Meerut", state: "Uttar Pradesh", lat: 28.9845, lng: 77.7064, pincode: "250001", radiusKm: 12 },
  { city: "Bareilly", district: "Bareilly", state: "Uttar Pradesh", lat: 28.367, lng: 79.4304, pincode: "243001", radiusKm: 11 },
  { city: "Aligarh", district: "Aligarh", state: "Uttar Pradesh", lat: 27.8974, lng: 78.088, pincode: "202001", radiusKm: 10 },
  { city: "Gorakhpur", district: "Gorakhpur", state: "Uttar Pradesh", lat: 26.7606, lng: 83.3732, pincode: "273001", radiusKm: 11 },
  { city: "Chandigarh", district: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794, pincode: "160017", radiusKm: 15, aliases: ["Mohali", "Panchkula", "Tricity"] },
  { city: "Ludhiana", district: "Ludhiana", state: "Punjab", lat: 30.901, lng: 75.8573, pincode: "141001", radiusKm: 14 },
  { city: "Amritsar", district: "Amritsar", state: "Punjab", lat: 31.634, lng: 74.8723, pincode: "143001", radiusKm: 13 },
  { city: "Jalandhar", district: "Jalandhar", state: "Punjab", lat: 31.326, lng: 75.5762, pincode: "144001", radiusKm: 11 },
  { city: "Patiala", district: "Patiala", state: "Punjab", lat: 30.3398, lng: 76.3869, pincode: "147001", radiusKm: 10 },
  { city: "Dehradun", district: "Dehradun", state: "Uttarakhand", lat: 30.3165, lng: 78.0322, pincode: "248001", radiusKm: 13 },
  { city: "Haridwar", district: "Haridwar", state: "Uttarakhand", lat: 29.9457, lng: 78.1642, pincode: "249401", radiusKm: 10, aliases: ["Rishikesh"] },
  { city: "Shimla", district: "Shimla", state: "Himachal Pradesh", lat: 31.1048, lng: 77.1734, pincode: "171001", radiusKm: 10 },
  { city: "Srinagar", district: "Srinagar", state: "Jammu and Kashmir", lat: 34.0837, lng: 74.7973, pincode: "190001", radiusKm: 13 },
  { city: "Jammu", district: "Jammu", state: "Jammu and Kashmir", lat: 32.7266, lng: 74.857, pincode: "180001", radiusKm: 12 },

  // ── Central India ─────────────────────────────────────────────────
  { city: "Indore", district: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577, pincode: "452001", radiusKm: 18 },
  { city: "Bhopal", district: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, pincode: "462001", radiusKm: 16 },
  { city: "Jabalpur", district: "Jabalpur", state: "Madhya Pradesh", lat: 23.1815, lng: 79.9864, pincode: "482001", radiusKm: 13 },
  { city: "Gwalior", district: "Gwalior", state: "Madhya Pradesh", lat: 26.2183, lng: 78.1828, pincode: "474001", radiusKm: 13 },
  { city: "Ujjain", district: "Ujjain", state: "Madhya Pradesh", lat: 23.1765, lng: 75.7885, pincode: "456001", radiusKm: 10 },
  { city: "Raipur", district: "Raipur", state: "Chhattisgarh", lat: 21.2514, lng: 81.6296, pincode: "492001", radiusKm: 15 },
  { city: "Bhilai", district: "Durg", state: "Chhattisgarh", lat: 21.1938, lng: 81.3509, pincode: "490001", radiusKm: 12, aliases: ["Durg", "Durg-Bhilai"] },
  { city: "Bilaspur", district: "Bilaspur", state: "Chhattisgarh", lat: 22.0797, lng: 82.1409, pincode: "495001", radiusKm: 10 },

  // ── East & North-East India ───────────────────────────────────────
  { city: "Kolkata", district: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, pincode: "700001", radiusKm: 25, aliases: ["Calcutta", "Howrah", "Salt Lake", "New Town"] },
  { city: "Siliguri", district: "Darjeeling", state: "West Bengal", lat: 26.7271, lng: 88.3953, pincode: "734001", radiusKm: 12 },
  { city: "Durgapur", district: "Paschim Bardhaman", state: "West Bengal", lat: 23.5204, lng: 87.3119, pincode: "713201", radiusKm: 11 },
  { city: "Asansol", district: "Paschim Bardhaman", state: "West Bengal", lat: 23.6739, lng: 86.9524, pincode: "713301", radiusKm: 11 },
  { city: "Patna", district: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, pincode: "800001", radiusKm: 16 },
  { city: "Gaya", district: "Gaya", state: "Bihar", lat: 24.7914, lng: 85.0002, pincode: "823001", radiusKm: 10 },
  { city: "Muzaffarpur", district: "Muzaffarpur", state: "Bihar", lat: 26.1209, lng: 85.3647, pincode: "842001", radiusKm: 10 },
  { city: "Ranchi", district: "Ranchi", state: "Jharkhand", lat: 23.3441, lng: 85.3096, pincode: "834001", radiusKm: 14 },
  { city: "Jamshedpur", district: "East Singhbhum", state: "Jharkhand", lat: 22.8046, lng: 86.2029, pincode: "831001", radiusKm: 13, aliases: ["Tatanagar"] },
  { city: "Dhanbad", district: "Dhanbad", state: "Jharkhand", lat: 23.7957, lng: 86.4304, pincode: "826001", radiusKm: 12 },
  { city: "Bhubaneswar", district: "Khordha", state: "Odisha", lat: 20.2961, lng: 85.8245, pincode: "751001", radiusKm: 16 },
  { city: "Cuttack", district: "Cuttack", state: "Odisha", lat: 20.4625, lng: 85.883, pincode: "753001", radiusKm: 10 },
  { city: "Rourkela", district: "Sundargarh", state: "Odisha", lat: 22.2604, lng: 84.8536, pincode: "769001", radiusKm: 10 },
  { city: "Berhampur", district: "Ganjam", state: "Odisha", lat: 19.3149, lng: 84.7941, pincode: "760001", radiusKm: 10, aliases: ["Brahmapur"] },
  { city: "Guwahati", district: "Kamrup Metropolitan", state: "Assam", lat: 26.1445, lng: 91.7362, pincode: "781001", radiusKm: 16, aliases: ["Gauhati", "Dispur"] },
  { city: "Shillong", district: "East Khasi Hills", state: "Meghalaya", lat: 25.5788, lng: 91.8933, pincode: "793001", radiusKm: 10 },
  { city: "Imphal", district: "Imphal West", state: "Manipur", lat: 24.817, lng: 93.9368, pincode: "795001", radiusKm: 10 },
  { city: "Agartala", district: "West Tripura", state: "Tripura", lat: 23.8315, lng: 91.2868, pincode: "799001", radiusKm: 10 },
];

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(district|dist\.?|city|municipal corporation|corporation|urban|metropolitan|mandal|taluk|tehsil)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Every searchable name of a city, normalized. */
function namesOf(c: CityRecord): string[] {
  return [c.city, ...(c.aliases ?? [])].map(normalizeName);
}

/** Exact (normalized) name/alias lookup, e.g. "Bangalore" → Bengaluru,
 * "Secunderabad" → Hyderabad, "NTR District" is NOT a city so → null. */
export function lookupCityByName(name: string | null | undefined): CityRecord | null {
  if (!name) return null;
  const key = normalizeName(name);
  if (!key) return null;
  return INDIAN_CITIES.find((c) => namesOf(c).includes(key)) ?? null;
}

/** Offline search across city names and aliases. Prefix matches rank first. */
export function findCity(query: string): CityRecord[] {
  const key = normalizeName(query);
  if (!key) return INDIAN_CITIES;
  const scored: Array<{ c: CityRecord; score: number }> = [];
  for (const c of INDIAN_CITIES) {
    const names = namesOf(c);
    let score = -1;
    if (names.some((n) => n === key)) score = 3;
    else if (names.some((n) => n.startsWith(key))) score = 2;
    else if (names.some((n) => n.includes(key))) score = 1;
    else if (normalizeName(c.district).includes(key) || normalizeName(c.state).startsWith(key)) score = 0;
    if (score >= 0) scored.push({ c, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.c);
}

/** Great-circle distance in km. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** The service city whose metro catchment contains the point (nearest centre
 * wins on overlap), or null when the point is outside every catchment. */
export function cityContaining(lat: number, lng: number): CityRecord | null {
  let best: CityRecord | null = null;
  let bestDist = Infinity;
  for (const c of INDIAN_CITIES) {
    const d = distanceKm(lat, lng, c.lat, c.lng);
    if (d <= (c.radiusKm ?? DEFAULT_RADIUS_KM) && d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

/** Nearest service city, optionally limited to `maxKm`. */
export function nearestCity(lat: number, lng: number, maxKm = Infinity): CityRecord | null {
  let best: CityRecord | null = null;
  let bestDist = Infinity;
  for (const c of INDIAN_CITIES) {
    const d = distanceKm(lat, lng, c.lat, c.lng);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return bestDist <= maxKm ? best : null;
}
