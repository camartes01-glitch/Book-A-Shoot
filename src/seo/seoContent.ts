/**
 * Single source of truth for Book A Shoot's local SEO pages.
 *
 *   /photographers                      → hub of every city
 *   /photographers/{city}               → one page per served city
 *   /photographers/{service}/{city}     → one page per strong service + city combination
 *
 * To add a page: add or extend a city / service below, then add an entry to
 * SERVICE_CITY_PAGES. Pages are generated, linked, put in the sitemap and
 * given structured data automatically. Only publish a combination when there
 * is real photographer coverage in that city and the copy is genuinely local:
 * thin or duplicate pages hurt the whole site.
 *
 * Facts about how booking works must stay true to the product
 * (see BOOKING_STEPS); never add ratings, review counts, prices or guarantees
 * that are not backed by real data.
 */

export const SITE_URL = "https://www.bookashoot.online";

export type Faq = { q: string; a: string };

export type SeoImage = { src: string; alt: string };

export type SeoCity = {
  slug: string;
  name: string;
  /** Other names people search with, e.g. Bangalore, Vizag. */
  altNames?: string[];
  state: string;
  title: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  localities: string[];
  /** Local knowledge that helps someone plan a shoot here. */
  planningNotes: { title: string; body: string }[];
  costGuide: string[];
  faqs: Faq[];
  hero: SeoImage;
};

export type SeoService = {
  slug: string;
  /** Event type pre-selected when the visitor starts a booking. */
  eventTypeId: string;
  /** "Wedding photographers" */
  name: string;
  /** "wedding photography" */
  noun: string;
  shortDescription: string;
};

export type ServiceCityPage = {
  service: string;
  city: string;
  title: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  whatToExpect: string[];
  localTip: { title: string; body: string };
  /**
   * Only for pages whose owner has supplied budget guidance. Shown as
   * indicative, never as a quote.
   */
  indicativeBudgets?: { name: string; range: string; description: string; includes: string[] }[];
  faqs: Faq[];
  hero: SeoImage;
  relatedArticles?: { title: string; path: string }[];
};

/* ────────────────────────────── How booking works ─────────────────────────── */

export const BOOKING_STEPS: { title: string; body: string }[] = [
  {
    title: "Describe your shoot",
    body: "Pick the event, date and venue, your budget and what you need delivered: photos, films, albums or reels. Multi-day events like Haldi, wedding and reception go in one request.",
  },
  {
    title: "Verified studios respond",
    body: "Your request goes to up to six KYC-verified studios in your city that match your event and budget. If a studio does not respond within an hour, we pass your request to another.",
  },
  {
    title: "Compare and confirm",
    body: "As studios accept, you see their names, contact details and work. Compare them, talk to them, and confirm the one you like. The others are released automatically.",
  },
];

export const WHY_BOOK_A_SHOOT: { title: string; body: string }[] = [
  {
    title: "KYC-verified studios",
    body: "Every studio is identity-verified before it can receive a booking request.",
  },
  {
    title: "One request, several studios",
    body: "Instead of calling studio after studio, send one request and hear back from up to six.",
  },
  {
    title: "Matched to your budget",
    body: "You set the budget; requests only go to studios whose packages fit it.",
  },
  {
    title: "No silent studios",
    body: "A studio that does not respond within an hour is replaced, so your request keeps moving.",
  },
];

const RELATED_WEDDING_ARTICLE = {
  title: "Indian wedding photography trends 2026",
  path: "/blog/indian-wedding-photography-trends-2026",
};

/* ──────────────────────────────── Services ──────────────────────────────── */

export const SEO_SERVICES: SeoService[] = [
  {
    slug: "wedding",
    eventTypeId: "wedding",
    name: "Wedding photographers",
    noun: "wedding photography",
    shortDescription: "Traditional and candid coverage of the muhurtham, rituals, family portraits and reception, with films and albums.",
  },
  {
    slug: "pre-wedding",
    eventTypeId: "pre_wedding",
    name: "Pre-wedding photographers",
    noun: "pre-wedding photography",
    shortDescription: "Couple shoots at heritage, nature or city locations, often with a short film or reel.",
  },
  {
    slug: "engagement",
    eventTypeId: "engagement",
    name: "Engagement photographers",
    noun: "engagement photography",
    shortDescription: "Ring ceremony and nischitartham coverage with candid family moments.",
  },
  {
    slug: "maternity",
    eventTypeId: "maternity_shoot",
    name: "Maternity photographers",
    noun: "maternity photography",
    shortDescription: "Calm, unhurried portrait sessions at a studio, outdoors or at home.",
  },
  {
    slug: "baby",
    eventTypeId: "baby_shoot",
    name: "Baby photographers",
    noun: "baby photography",
    shortDescription: "Newborn, first-month and milestone shoots with safe, patient handling.",
  },
  {
    slug: "birthday",
    eventTypeId: "birthday",
    name: "Birthday photographers",
    noun: "birthday photography",
    shortDescription: "First birthdays, kids' parties and milestone celebrations at home or a venue.",
  },
  {
    slug: "corporate",
    eventTypeId: "corporate_event",
    name: "Corporate event photographers",
    noun: "corporate event photography",
    shortDescription: "Conferences, offsites, launches and award nights, with fast delivery for PR.",
  },
  {
    slug: "product",
    eventTypeId: "product_shoot",
    name: "Product photographers",
    noun: "product photography",
    shortDescription: "Clean catalogue, e-commerce and lifestyle images for brands and sellers.",
  },
];

/* ───────────────────────────────── Cities ───────────────────────────────── */

export const SEO_CITIES: SeoCity[] = [
  {
    slug: "hyderabad",
    name: "Hyderabad",
    state: "Telangana",
    title: "Photographers in Hyderabad | Book A Shoot",
    metaDescription:
      "Find and book verified photographers in Hyderabad for weddings, pre-wedding shoots, birthdays, maternity and corporate events. Send one request and compare studios that fit your budget.",
    h1: "Find & book verified photographers in Hyderabad",
    intro: [
      "Hyderabad celebrates at every scale, from Telugu weddings in Shamshabad's convention halls to Nikah and Walima evenings in the Old City and corporate launches around HITEC City. Book A Shoot connects you with KYC-verified photography studios across Greater Hyderabad.",
      "Tell us your event, date, venue and budget once. Your request reaches up to six studios that cover your area and fit your budget, and you compare the ones that accept before confirming.",
    ],
    localities: [
      "Gachibowli", "HITEC City", "Madhapur", "Kondapur", "Jubilee Hills", "Banjara Hills",
      "Kukatpally", "Secunderabad", "Shamshabad", "Kompally", "Manikonda", "LB Nagar",
    ],
    planningNotes: [
      {
        title: "Wedding season fills up early",
        body: "Popular muhurtham dates between November and February, and again in May, are booked months ahead. Send your request as soon as your date is fixed.",
      },
      {
        title: "Plan around traffic",
        body: "Venues in Shamshabad, Gandipet and Moinabad can be over an hour from the western IT corridor. Mention the venue so studios can plan crew travel and arrival times.",
      },
      {
        title: "Heritage locations need planning",
        body: "Golconda, the Qutb Shahi Tombs and Chowmahalla Palace are popular backdrops. Some sites restrict tripods, drones or commercial shoots, so confirm permissions with your studio first.",
      },
    ],
    costGuide: [
      "Photography costs in Hyderabad depend on the number of event days, crew size (traditional, candid, cinematography), hours of coverage, drone use, and deliverables such as albums, films and same-day reels.",
      "On Book A Shoot you set your own budget. Your request only goes to studios whose packages fit it, and each studio that accepts shares what it includes so you can compare like for like.",
    ],
    faqs: [
      {
        q: "How do I book a photographer in Hyderabad?",
        a: "Send one request with your event type, date, venue and budget. It goes to up to six verified studios in Hyderabad that fit your budget. You see the studios that accept, compare them, and confirm the one you prefer.",
      },
      {
        q: "Can I book a photographer for a single-day event?",
        a: "Yes. Requests can be for a single event of a few hours, like a birthday or engagement, or for several days such as Haldi, wedding and reception together.",
      },
      {
        q: "Do studios cover venues outside the city, like Shamshabad or Moinabad?",
        a: "Yes. Add the exact venue to your request and studios that cover that area will respond. Travel for venues far outside the city is agreed directly with the studio you choose.",
      },
      {
        q: "How do I check a photographer's availability for my date?",
        a: "Your request includes the date, so studios only accept if they are free. You don't need to call around to check.",
      },
      {
        q: "Can I get both photography and videography?",
        a: "Yes. Choose the deliverables you need, such as candid photos, traditional photos, a cinematic film, reels or drone coverage, and studios that offer them will respond.",
      },
    ],
    hero: { src: "/hyderabad-charminar.webp", alt: "Charminar in Hyderabad at sunset, surrounded by the Old City markets" },
  },
  {
    slug: "vijayawada",
    name: "Vijayawada",
    altNames: ["Bezawada"],
    state: "Andhra Pradesh",
    title: "Photographers in Vijayawada | Book A Shoot",
    metaDescription:
      "Book verified photographers in Vijayawada for weddings, pre-wedding shoots, birthdays, engagements and baby shoots. Compare local studios that fit your budget and date.",
    h1: "Find & book verified photographers in Vijayawada",
    intro: [
      "Vijayawada is where Book A Shoot started, and it's one of the busiest wedding cities in Andhra Pradesh. Celebrations here range from temple weddings near Indrakeeladri to grand receptions in function halls along the Benz Circle and Gunadala corridor, plus a full calendar of engagements, naming ceremonies and first birthdays.",
      "Book A Shoot sends your request to KYC-verified studios across Vijayawada and the nearby Amaravati, Mangalagiri and Gannavaram areas, so you hear back from photographers who actually cover your venue.",
    ],
    localities: [
      "Benz Circle", "Labbipet", "Governorpet", "Patamata", "Gunadala", "Moghalrajpuram",
      "Kanuru", "Poranki", "Tadepalli", "Mangalagiri", "Gannavaram", "Ibrahimpatnam",
    ],
    planningNotes: [
      {
        title: "Beat the summer heat",
        body: "April to June is very hot in Vijayawada. Schedule outdoor shoots for early morning or after 5 PM, and plan indoor backups for daytime rituals.",
      },
      {
        title: "Riverside and hill backdrops",
        body: "The Krishna riverfront, Prakasam Barrage, Bhavani Island and the Undavalli Caves are favourite outdoor locations. Some need entry tickets or prior permission for professional shoots.",
      },
      {
        title: "Muhurtham dates cluster",
        body: "Auspicious dates draw many weddings on the same day across the city. Booking early gives you a wider choice of studios.",
      },
    ],
    costGuide: [
      "Costs in Vijayawada depend on how many functions you want covered, the crew size, whether you add candid photography or a cinematic film, and album and video deliverables.",
      "Set the budget you're comfortable with and your request reaches only studios that work within it. Every studio that accepts shows you its details, so you can compare before you decide.",
    ],
    faqs: [
      {
        q: "How do I find a good wedding photographer in Vijayawada?",
        a: "Send a single request with your date, venue and budget. Verified studios in Vijayawada that fit your budget respond, and you can compare their work and talk to them before confirming.",
      },
      {
        q: "Do Vijayawada studios cover Guntur, Mangalagiri and Amaravati?",
        a: "Many do. Enter your exact venue and studios that serve that area will see your request.",
      },
      {
        q: "Can I book a photographer for a naming ceremony or first birthday?",
        a: "Yes. Choose the event type when you start your request. Short events of a few hours are welcome.",
      },
    ],
    hero: { src: "/vijayawada-krishna-river-indrakeeladri.webp", alt: "Krishna river bridge and Indrakeeladri hill in Vijayawada at sunset" },
  },
  {
    slug: "bengaluru",
    name: "Bengaluru",
    altNames: ["Bangalore"],
    state: "Karnataka",
    title: "Photographers in Bangalore | Book A Shoot",
    metaDescription:
      "Book verified photographers in Bangalore (Bengaluru) for weddings, candid shoots, pre-wedding, maternity and product photography. Send one request and compare studios.",
    h1: "Find & book verified photographers in Bengaluru",
    intro: [
      "Bengaluru's celebrations are as varied as the city: Kannada, Telugu, Tamil and North Indian weddings, intimate garden ceremonies, startup launches and maternity shoots in leafy parks. Book A Shoot connects you with KYC-verified photographers across Bengaluru, also known as Bangalore.",
      "Send one request with your event, date, area and budget. Up to six matching studios respond, and you compare them before you confirm.",
    ],
    localities: [
      "Indiranagar", "Koramangala", "Whitefield", "HSR Layout", "Jayanagar", "JP Nagar",
      "Electronic City", "Hebbal", "Yelahanka", "Malleshwaram", "Sarjapur Road", "Devanahalli",
    ],
    planningNotes: [
      {
        title: "Have a rain plan",
        body: "Afternoon showers are common from May to October. For outdoor shoots, morning slots and a covered backup location keep the schedule safe.",
      },
      {
        title: "Allow for travel time",
        body: "Crossing the city can take well over an hour. Studios based near your venue, say Whitefield or Devanahalli, save travel time and often cost.",
      },
      {
        title: "Popular outdoor locations",
        body: "Cubbon Park, Lalbagh and Nandi Hills at sunrise are favourites. Some public parks restrict professional equipment, so check with your studio.",
      },
    ],
    costGuide: [
      "Costs in Bengaluru vary with coverage hours, the number of photographers and videographers, studio rental for indoor shoots, travel across the city, and deliverables like albums, edited films or product image sets.",
      "You set the budget. Only studios that work within it receive your request, and each one that accepts shares its details for an easy comparison.",
    ],
    faqs: [
      {
        q: "How do I book a photographer in Bangalore?",
        a: "Start a request with your event type, date, area and budget. Verified studios in Bengaluru that fit receive it, and you confirm the one you like after comparing.",
      },
      {
        q: "Do you have candid wedding photographers in Bangalore?",
        a: "Yes. Choose candid photography in your deliverables and studios that offer it will respond.",
      },
      {
        q: "Can I book a product or e-commerce photographer?",
        a: "Yes. Choose Product Shoot as your event type and describe the products and number of images you need.",
      },
      {
        q: "Is there a minimum duration for a booking?",
        a: "No fixed minimum. Short sessions like a maternity or product shoot of a couple of hours are common.",
      },
    ],
    hero: { src: "/bengaluru-vidhana-soudha.webp", alt: "Vidhana Soudha in Bengaluru under an orange evening sky" },
  },
  {
    slug: "visakhapatnam",
    name: "Visakhapatnam",
    altNames: ["Vizag"],
    state: "Andhra Pradesh",
    title: "Photographers in Visakhapatnam (Vizag) | Book A Shoot",
    metaDescription:
      "Book verified photographers in Visakhapatnam (Vizag) for weddings, beach pre-wedding shoots, birthdays and maternity sessions. Compare local studios that fit your budget.",
    h1: "Find & book verified photographers in Visakhapatnam",
    intro: [
      "With beaches, hills and a long coastline, Visakhapatnam (Vizag) is a natural setting for wedding and pre-wedding photography. Couples come for sunrise at RK Beach, the Beach Road curves near Rushikonda and the views from Kailasagiri, while families celebrate everything from temple weddings to first birthdays.",
      "Book A Shoot sends your request to KYC-verified studios across Visakhapatnam, from MVP Colony and Siripuram to Madhurawada and Bheemunipatnam.",
    ],
    localities: [
      "RK Beach", "MVP Colony", "Siripuram", "Dwaraka Nagar", "Seethammadhara", "Rushikonda",
      "Madhurawada", "Yendada", "Gajuwaka", "Pendurthi", "Simhachalam", "Bheemunipatnam",
    ],
    planningNotes: [
      {
        title: "Use the coastal light",
        body: "Sunrise on the east coast is early and soft. Beach shoots between 5:30 and 8 AM avoid harsh light and crowds.",
      },
      {
        title: "Monsoon and humidity",
        body: "June to September brings rain and high humidity. Keep outdoor plans flexible, and ask your studio about weather backup dates.",
      },
      {
        title: "Destination shoots nearby",
        body: "Araku Valley and Lambasingi are popular pre-wedding destinations a few hours away. Mention the location in your request so studios can plan travel.",
      },
    ],
    costGuide: [
      "Costs in Visakhapatnam depend on coverage hours and event days, crew size, travel to locations like Araku, drone coverage on beaches and hills, and deliverables such as films and albums.",
      "Set your budget when you send the request; it only reaches studios that fit, and each one that accepts shares its details so you can compare.",
    ],
    faqs: [
      {
        q: "How do I book a wedding photographer in Vizag?",
        a: "Send one request with your date, venue and budget. Verified studios in Visakhapatnam that fit respond, and you confirm the one you prefer.",
      },
      {
        q: "Can I book a beach pre-wedding shoot in Vizag?",
        a: "Yes. Choose Pre-Wedding and mention the beach or location. Studios familiar with Vizag's beaches and viewpoints will respond.",
      },
      {
        q: "Do Vizag studios travel to Araku Valley?",
        a: "Many do. Add Araku as the location so studios can include travel in what they offer.",
      },
      {
        q: "Can I book a photographer at short notice?",
        a: "Yes. Your request reaches studios as soon as you send it, and studios free on your date can accept straight away.",
      },
    ],
    hero: { src: "/visakhapatnam-rk-beach.webp", alt: "RK Beach and Beach Road in Visakhapatnam at sunset" },
  },
];

/* ───────────────────────────── Service + city ───────────────────────────── */

export const SERVICE_CITY_PAGES: ServiceCityPage[] = [
  {
    service: "wedding",
    city: "hyderabad",
    title: "Wedding Photographers in Hyderabad | Book A Shoot",
    metaDescription:
      "Book verified wedding photographers in Hyderabad for Telugu weddings, Nikah and receptions. Candid, traditional and cinematic coverage. Compare studios that fit your budget.",
    h1: "Wedding photographers in Hyderabad",
    intro: [
      "From grand Telugu muhurthams in Shamshabad's convention centres to Nikah and Walima evenings in the Old City, Hyderabad weddings need photographers who know the rituals and the venues. Book A Shoot sends your wedding request to KYC-verified studios across Greater Hyderabad.",
      "Add every function, from Haldi and Mehendi to the wedding and reception, in one request. Studios that fit your budget and are free on your dates respond, and you compare them before confirming.",
    ],
    whatToExpect: [
      "Traditional and candid photographers covering the muhurtham, rituals and family portraits",
      "Cinematic wedding films, teasers and highlight reels",
      "Drone coverage for large outdoor venues, where the venue allows it",
      "Albums and online galleries delivered by the studio you choose",
      "Multi-day coverage of Haldi, Mehendi, Sangeet, wedding and reception in one booking",
    ],
    localTip: {
      title: "Book early for peak muhurtham dates",
      body: "Muhurtham dates between November and February, and in May and June, are booked months ahead in Hyderabad. Sending your request as soon as the date is fixed gives you the widest choice.",
    },
    indicativeBudgets: [
      {
        name: "Single-day wedding",
        range: "₹35,000 – ₹55,000",
        description: "Typical for a one-day ceremony or a small reception.",
        includes: ["Traditional photographer", "Candid photographer", "Digital gallery"],
      },
      {
        name: "Two-day coverage",
        range: "₹85,000 – ₹1,40,000",
        description: "Haldi or Mehendi plus the wedding and reception.",
        includes: ["2 photographers and a cinematographer", "Teaser and highlight film", "Album"],
      },
      {
        name: "Multi-day wedding",
        range: "₹1,80,000 – ₹2,75,000+",
        description: "Three to four days with a larger crew.",
        includes: ["Crew of 4–6", "Reels and films", "Premium albums"],
      },
    ],
    faqs: [
      {
        q: "How much does a wedding photographer cost in Hyderabad?",
        a: "It depends on the number of functions, crew size, films, drone use and albums. The ranges on this page are indicative; you set your own budget in the request, and only studios that fit it respond.",
      },
      {
        q: "Do Hyderabad wedding photographers cover Nikah and Walima?",
        a: "Yes. Choose the events you need in your request and studios experienced with them will respond.",
      },
      {
        q: "Can I book candid and traditional photographers together?",
        a: "Yes. Select both in your deliverables. Most studios offer a combined team.",
      },
      {
        q: "Do studios travel to Shamshabad and outer resorts?",
        a: "Yes. Add your venue to the request and studios that cover it respond. Any travel charges are agreed with the studio you choose.",
      },
    ],
    hero: { src: "/blog1.webp", alt: "Candid wedding photography in Hyderabad by a Book A Shoot verified studio" },
    relatedArticles: [RELATED_WEDDING_ARTICLE],
  },
  {
    service: "wedding",
    city: "vijayawada",
    title: "Wedding Photographers in Vijayawada | Book A Shoot",
    metaDescription:
      "Book verified wedding photographers in Vijayawada for temple weddings, function-hall ceremonies and receptions. Candid and traditional coverage. Compare studios that fit your budget.",
    h1: "Wedding photographers in Vijayawada",
    intro: [
      "Vijayawada weddings move fast: early-morning muhurthams, packed function halls and receptions the same evening. Book A Shoot sends your request to KYC-verified studios across Vijayawada, Tadepalli, Mangalagiri and Gannavaram that are free on your date.",
      "Send the whole wedding, from Pellikuthuru and Pellikoduku ceremonies to the reception, in one request, and compare the studios that accept before you confirm.",
    ],
    whatToExpect: [
      "Traditional photographers who know the sequence of Telugu wedding rituals",
      "Candid coverage of family moments, alongside the formal portraits",
      "Wedding films and highlight reels for sharing",
      "Coverage of Pellikuthuru, Pellikoduku, the muhurtham and the reception",
      "Albums and digital galleries from the studio you confirm",
    ],
    localTip: {
      title: "Plan for early muhurthams",
      body: "Many Vijayawada muhurthams fall before sunrise. Confirm the crew's arrival time and lighting plan with your studio, especially for temple or open-air mandaps.",
    },
    faqs: [
      {
        q: "How far ahead should I book a wedding photographer in Vijayawada?",
        a: "As soon as your muhurtham is fixed. Popular dates see many weddings across the city on the same day.",
      },
      {
        q: "Do studios cover weddings in Guntur and Amaravati?",
        a: "Many Vijayawada studios do. Enter the venue and studios that cover it will respond.",
      },
      {
        q: "Can I book only for the muhurtham and reception?",
        a: "Yes. Add just the events you want covered.",
      },
    ],
    hero: { src: "/hero2.webp", alt: "Traditional wedding photography in Vijayawada by a Book A Shoot verified studio" },
    relatedArticles: [RELATED_WEDDING_ARTICLE],
  },
  {
    service: "wedding",
    city: "bengaluru",
    title: "Wedding Photographers in Bangalore | Book A Shoot",
    metaDescription:
      "Book verified wedding photographers in Bangalore (Bengaluru). Candid, traditional and cinematic coverage for every tradition. Compare studios that fit your budget and date.",
    h1: "Wedding photographers in Bengaluru",
    intro: [
      "Bengaluru hosts weddings from every tradition: Kannada, Telugu, Tamil, Malayali and North Indian, often blended in a single celebration. Book A Shoot sends your request to KYC-verified wedding photographers across Bengaluru (Bangalore) who are free on your date.",
      "Garden and resort weddings around Devanahalli and Sarjapur Road and banquet receptions in the city all work the same way: one request, studios that fit your budget respond, and you choose.",
    ],
    whatToExpect: [
      "Candid photographers for natural, documentary-style coverage",
      "Traditional coverage of rituals across Kannada, Telugu, Tamil and North Indian weddings",
      "Cinematic films and highlight reels",
      "Coverage of outdoor resort weddings, with rain backup plans",
      "Albums and online galleries from the studio you confirm",
    ],
    localTip: {
      title: "Choose studios near your venue",
      body: "Travel across Bengaluru can take hours on a wedding day. Studios based near resort belts like Devanahalli or Sarjapur Road reach early and reduce travel cost.",
    },
    faqs: [
      {
        q: "Are there candid wedding photographers in Bangalore?",
        a: "Yes. Choose candid photography in your deliverables and studios that specialise in it will respond.",
      },
      {
        q: "Can one studio cover a wedding with two traditions?",
        a: "Yes. Describe both ceremonies in your request so studios can staff them.",
      },
      {
        q: "What happens if it rains during an outdoor wedding?",
        a: "Discuss a covered backup area with your venue and studio in advance. Studios on Book A Shoot are used to Bengaluru's afternoon showers.",
      },
    ],
    hero: { src: "/blog2.webp", alt: "Candid wedding photography in Bengaluru by a Book A Shoot verified studio" },
    relatedArticles: [RELATED_WEDDING_ARTICLE],
  },
  {
    service: "wedding",
    city: "visakhapatnam",
    title: "Wedding Photographers in Visakhapatnam (Vizag) | Book A Shoot",
    metaDescription:
      "Book verified wedding photographers in Visakhapatnam (Vizag) for temple, beachside and function-hall weddings. Compare local studios that fit your budget and date.",
    h1: "Wedding photographers in Visakhapatnam",
    intro: [
      "Weddings in Visakhapatnam range from temple ceremonies near Simhachalam to beachside receptions along the coast. Book A Shoot sends your request to KYC-verified studios across Vizag that are free on your date.",
      "Add every function in one request, compare the studios that accept, and confirm the one whose work you like.",
    ],
    whatToExpect: [
      "Traditional and candid coverage of Telugu wedding rituals",
      "Beachside and outdoor reception coverage with sunset portraits",
      "Wedding films, teasers and reels",
      "Drone coverage for open-air venues, where allowed",
      "Albums and online galleries from the studio you confirm",
    ],
    localTip: {
      title: "Plan portraits for golden hour",
      body: "Vizag's coastline gives beautiful light after 5 PM. Schedule couple portraits before the reception to make the most of it, and keep humidity in mind for long outdoor sessions.",
    },
    faqs: [
      {
        q: "Can I book a photographer for a beachside wedding in Vizag?",
        a: "Yes. Add your venue to the request; studios experienced with outdoor coastal shoots will respond.",
      },
      {
        q: "Do Vizag studios cover weddings in Vizianagaram and Srikakulam?",
        a: "Some do. Enter your venue and studios that cover it will see your request.",
      },
      {
        q: "Can I add a pre-wedding shoot to the same booking?",
        a: "Yes. Add the pre-wedding shoot as another event day in the same request.",
      },
    ],
    hero: { src: "/hero3.webp", alt: "Wedding photography in Visakhapatnam by a Book A Shoot verified studio" },
    relatedArticles: [RELATED_WEDDING_ARTICLE],
  },
  {
    service: "pre-wedding",
    city: "hyderabad",
    title: "Pre-Wedding Photographers in Hyderabad | Book A Shoot",
    metaDescription:
      "Book verified pre-wedding photographers in Hyderabad for shoots at heritage sites, lakes and studios. Photos, teasers and reels. Compare studios that fit your budget.",
    h1: "Pre-wedding photographers in Hyderabad",
    intro: [
      "Hyderabad's mix of Qutb Shahi heritage, lakes and modern skyline gives couples endless pre-wedding backdrops. Book A Shoot connects you with KYC-verified pre-wedding photographers who know the city's locations and their best light.",
      "Tell us the date, the look you want and your budget. Studios that fit respond, and you compare their work before confirming.",
    ],
    whatToExpect: [
      "Guided posing and natural movement direction",
      "Sunrise and golden-hour scheduling",
      "Help planning outfits and props for each location",
      "Short cinematic teasers or reels",
      "Edited, colour-graded photos delivered online",
    ],
    localTip: {
      title: "Go early on a weekday",
      body: "Start around 6 AM on a weekday to avoid crowds at heritage sites and catch the softest light. Check whether your chosen site needs permission for professional shoots.",
    },
    indicativeBudgets: [
      {
        name: "Half-day, one location",
        range: "₹20,000 – ₹35,000",
        description: "Around four hours at a single location.",
        includes: ["Candid photographer", "Outfit changes", "Edited photos"],
      },
      {
        name: "Full day, multiple locations",
        range: "₹45,000 – ₹75,000",
        description: "Two or three locations with video.",
        includes: ["Photographer and cinematographer", "Teaser or reel", "Edited photos"],
      },
    ],
    faqs: [
      {
        q: "Which are the best pre-wedding locations in Hyderabad?",
        a: "Popular choices include Chowmahalla Palace, Taramati Baradari, the Qutb Shahi Tombs area, the Durgam Cheruvu cable bridge at dusk, and farmstays around Moinabad.",
      },
      {
        q: "What should we wear for a pre-wedding shoot?",
        a: "Many couples plan one traditional outfit for heritage backdrops and one contemporary look for city or golden-hour shots. Your studio can advise for your locations.",
      },
      {
        q: "Can we get a short video along with photos?",
        a: "Yes. Add a teaser or reel to your deliverables and studios offering video will respond.",
      },
    ],
    hero: { src: "/hero1.webp", alt: "Pre-wedding couple photoshoot in Hyderabad by a Book A Shoot verified studio" },
  },
  {
    service: "pre-wedding",
    city: "vijayawada",
    title: "Pre-Wedding Photoshoot in Vijayawada | Book A Shoot",
    metaDescription:
      "Book a pre-wedding photoshoot in Vijayawada with verified photographers. Riverside, hill and studio locations. Compare studios that fit your budget.",
    h1: "Pre-wedding photographers in Vijayawada",
    intro: [
      "The Krishna riverfront, Bhavani Island, Gandhi Hill and the Undavalli Caves give Vijayawada couples striking pre-wedding settings close to home. Book A Shoot sends your request to KYC-verified photographers who shoot there regularly.",
      "Share your date, preferred locations and budget. Studios that fit respond, and you choose the one whose style you like.",
    ],
    whatToExpect: [
      "Riverside, heritage and studio shoot options",
      "Pose and movement guidance for couples new to the camera",
      "Morning and evening schedules that avoid the midday heat",
      "Short films and reels to share with family",
      "Edited photos delivered online",
    ],
    localTip: {
      title: "Shoot in the cooler months",
      body: "October to February gives the most comfortable weather for outdoor shoots in Vijayawada. In summer, plan for early mornings or an indoor studio.",
    },
    faqs: [
      {
        q: "Where can we do a pre-wedding shoot near Vijayawada?",
        a: "The Krishna riverfront and Prakasam Barrage, Bhavani Island, Gandhi Hill and the Undavalli Caves are popular. Some places need entry tickets or prior permission for professional shoots.",
      },
      {
        q: "Can we travel to another location, like Araku or Hyderabad?",
        a: "Yes. Mention the destination in your request so studios can plan travel.",
      },
      {
        q: "How long does a pre-wedding shoot take?",
        a: "Most shoots take half a day to a full day, depending on the number of locations and outfit changes.",
      },
    ],
    hero: { src: "/hero1.webp", alt: "Pre-wedding photoshoot in Vijayawada by a Book A Shoot verified studio" },
  },
  {
    service: "maternity",
    city: "bengaluru",
    title: "Maternity Photographers in Bangalore | Book A Shoot",
    metaDescription:
      "Book verified maternity photographers in Bangalore (Bengaluru) for studio, home and outdoor shoots. Gentle, unhurried sessions. Compare studios that fit your budget.",
    h1: "Maternity photographers in Bengaluru",
    intro: [
      "A maternity shoot should feel calm and comfortable. Book A Shoot connects you with KYC-verified maternity photographers across Bengaluru who work at your pace, whether in a studio, at home or in one of the city's green spaces.",
      "Share your preferred date, setting and budget. Studios that fit respond, and you choose the one you're most comfortable with.",
    ],
    whatToExpect: [
      "Unhurried sessions with plenty of rest breaks",
      "Studio, home or outdoor garden settings",
      "Partner and family portraits in the same session",
      "Guidance on outfits and flowing fabrics",
      "Soft, natural retouching",
    ],
    localTip: {
      title: "Morning light in the gardens",
      body: "Between 7 and 9 AM, places like Cubbon Park or farm venues near Sarjapur offer cool weather and soft light, before crowds and afternoon showers.",
    },
    indicativeBudgets: [
      {
        name: "Studio session",
        range: "₹15,000 – ₹25,000",
        description: "About two hours in a private studio.",
        includes: ["Maternity photographer", "Outfit changes", "Retouched portraits"],
      },
      {
        name: "Outdoor or family session",
        range: "₹30,000 – ₹50,000",
        description: "Outdoor venue with partner and family.",
        includes: ["Lead photographer", "Family portraits", "Retouched portraits"],
      },
    ],
    faqs: [
      {
        q: "When is the best time for a maternity photoshoot?",
        a: "Many people choose weeks 28 to 34 of pregnancy, when the bump shows well and moving around is still comfortable. Always follow your doctor's advice.",
      },
      {
        q: "Can my partner and children join?",
        a: "Yes. Mention who will join in your request so the studio can plan the session.",
      },
      {
        q: "Can the shoot happen at home?",
        a: "Yes. Choose your home as the location and studios that do home shoots will respond.",
      },
    ],
    hero: { src: "/blog2.webp", alt: "Maternity photoshoot in Bengaluru by a Book A Shoot verified studio" },
  },
  {
    service: "maternity",
    city: "hyderabad",
    title: "Maternity Photographers in Hyderabad | Book A Shoot",
    metaDescription:
      "Book verified maternity photographers in Hyderabad for studio, home and outdoor shoots, plus seemantham coverage. Compare studios that fit your budget.",
    h1: "Maternity photographers in Hyderabad",
    intro: [
      "Book A Shoot connects you with KYC-verified maternity photographers across Hyderabad for relaxed portrait sessions and for traditional celebrations like the seemantham (baby shower).",
      "Choose a studio, your home or an outdoor location, set your budget, and compare the studios that respond before you confirm.",
    ],
    whatToExpect: [
      "Comfortable, unhurried sessions with breaks",
      "Studio, home or garden settings",
      "Coverage of seemantham and baby shower ceremonies",
      "Partner and family portraits",
      "Gentle, natural retouching",
    ],
    localTip: {
      title: "Avoid the midday heat",
      body: "For outdoor sessions in Hyderabad, early mornings or the hour before sunset are the most comfortable, especially from March to June.",
    },
    faqs: [
      {
        q: "Can I book a photographer for a seemantham or baby shower?",
        a: "Yes. Choose Maternity Shoot or Other and describe the ceremony in your request.",
      },
      {
        q: "Are indoor studio sessions available?",
        a: "Yes. Ask for a studio setting and studios with indoor spaces will respond.",
      },
      {
        q: "How long does a maternity shoot take?",
        a: "Usually one to three hours, with breaks whenever you need them.",
      },
    ],
    hero: { src: "/blog2.webp", alt: "Maternity photography in Hyderabad by a Book A Shoot verified studio" },
  },
  {
    service: "birthday",
    city: "hyderabad",
    title: "Birthday Photographers in Hyderabad | Book A Shoot",
    metaDescription:
      "Book verified birthday party photographers in Hyderabad for first birthdays, kids' parties and milestone celebrations. Compare studios that fit your budget.",
    h1: "Birthday photographers in Hyderabad",
    intro: [
      "First birthdays in Hyderabad are often as big as weddings, with themed decor, a cake ceremony and a full guest list. Book A Shoot connects you with KYC-verified photographers who cover birthday parties at homes, banquet halls and party venues across the city.",
      "Send your date, venue and budget. Studios that fit respond, and you choose the one you like.",
    ],
    whatToExpect: [
      "Candid coverage of the cake cutting, games and family moments",
      "Portraits of the birthday child and family",
      "Decor and venue shots",
      "Short highlight videos and reels",
      "Edited photos delivered online",
    ],
    localTip: {
      title: "Share the schedule in advance",
      body: "Kids' parties move quickly. Give your studio the timings for the cake cutting, rituals and games so nothing is missed.",
    },
    faqs: [
      {
        q: "Can I book a photographer for just two or three hours?",
        a: "Yes. Set the event time in your request; short party coverage is common.",
      },
      {
        q: "Can I get a video along with photos?",
        a: "Yes. Add a highlight video or reel to your deliverables.",
      },
      {
        q: "Do you cover first birthday ceremonies with traditional rituals?",
        a: "Yes. Describe the rituals in your request so studios can plan the coverage.",
      },
    ],
    hero: { src: "/hero2.webp", alt: "Birthday party photography in Hyderabad by a Book A Shoot verified studio" },
  },
  {
    service: "birthday",
    city: "vijayawada",
    title: "Birthday Photographers in Vijayawada | Book A Shoot",
    metaDescription:
      "Book verified birthday photographers in Vijayawada for first birthdays, kids' parties and family celebrations. Compare local studios that fit your budget.",
    h1: "Birthday photographers in Vijayawada",
    intro: [
      "From a first birthday in a function hall to a small party at home, Book A Shoot connects you with KYC-verified photographers across Vijayawada who capture the moments your family will want to keep.",
      "Share your date, venue and budget once, and compare the studios that respond before you confirm.",
    ],
    whatToExpect: [
      "Candid coverage of the cake cutting and family moments",
      "Coverage of traditional rituals for first birthdays",
      "Family and group portraits",
      "Highlight videos and reels",
      "Edited photos delivered online",
    ],
    localTip: {
      title: "Plan around the heat",
      body: "For summer birthdays, indoor venues or evening parties keep children and guests comfortable, and photos look better without harsh midday light.",
    },
    faqs: [
      {
        q: "Can I book a photographer for a birthday at home?",
        a: "Yes. Enter your home address as the venue.",
      },
      {
        q: "Can I combine a naming ceremony and first birthday?",
        a: "Yes. Add each as a separate event day in the same request.",
      },
      {
        q: "What if a studio doesn't respond?",
        a: "If a studio doesn't respond within an hour, your request is passed to another verified studio, so it keeps moving.",
      },
    ],
    hero: { src: "/hero2.webp", alt: "Birthday photography in Vijayawada by a Book A Shoot verified studio" },
  },
];

/* ──────────────────────────────── Helpers ──────────────────────────────── */

export function getCity(slug: string | undefined): SeoCity | undefined {
  return SEO_CITIES.find((c) => c.slug === slug);
}

export function getService(slug: string | undefined): SeoService | undefined {
  return SEO_SERVICES.find((s) => s.slug === slug);
}

export function getServiceCityPage(service: string | undefined, city: string | undefined): ServiceCityPage | undefined {
  return SERVICE_CITY_PAGES.find((p) => p.service === service && p.city === city);
}

export function serviceCityPath(service: string, city: string): string {
  return `/photographers/${service}/${city}`;
}

export function cityPath(city: string): string {
  return `/photographers/${city}`;
}

/** Published service + city pages for one city, in service order. */
export function pagesForCity(city: string): ServiceCityPage[] {
  return SEO_SERVICES.map((s) => getServiceCityPage(s.slug, city)).filter((p): p is ServiceCityPage => Boolean(p));
}

/** The same service in the other cities that have a page for it. */
export function sameServiceOtherCities(service: string, city: string): ServiceCityPage[] {
  return SERVICE_CITY_PAGES.filter((p) => p.service === service && p.city !== city);
}
