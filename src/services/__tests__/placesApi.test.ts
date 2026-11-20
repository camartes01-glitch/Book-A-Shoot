/**
 * Location search must never guess a city, and must stay cheap and fast when
 * Google refuses the key (e.g. billing not enabled):
 *  - a Google place that can't be loaded throws (no silent "Hyderabad" default)
 *  - a 403 from Google trips a breaker: later searches go straight to Photon
 *  - autocomplete + details share one billing session token
 */
jest.mock("expo-location", () => ({}));

type FetchCall = { url: string; init?: RequestInit };

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const PHOTON_HIT = {
  features: [
    {
      geometry: { coordinates: [80.648, 16.5062] },
      properties: { osm_id: 1, osm_type: "N", name: "Benz Circle", city: "Vijayawada", state: "Andhra Pradesh", postcode: "520010", type: "street" },
    },
  ],
};

function loadPlaces(key = "test-key") {
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = key;
  let mod: typeof import("@/src/services/placesApi");
  jest.isolateModules(() => {
    mod = require("@/src/services/placesApi");
  });
  return mod!;
}

describe("placesApi", () => {
  let calls: FetchCall[];
  const realFetch = global.fetch;

  beforeEach(() => {
    calls = [];
  });
  afterAll(() => {
    global.fetch = realFetch;
    delete process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  });

  test("a Google 403 trips the breaker: the next search skips Google entirely", async () => {
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("places.googleapis.com")) {
        return jsonResponse(403, { error: { status: "PERMISSION_DENIED", message: "billing" } });
      }
      return jsonResponse(200, PHOTON_HIT);
    }) as unknown as typeof fetch;

    const places = loadPlaces();
    const first = await places.searchPlaceSuggestions("benz circle");
    expect(first.some((s) => s.label === "Benz Circle")).toBe(true);
    expect(calls.filter((c) => c.url.includes("places.googleapis.com"))).toHaveLength(1);

    calls = [];
    await places.searchPlaceSuggestions("benz circle vijayawada");
    expect(calls.some((c) => c.url.includes("places.googleapis.com"))).toBe(false);
    expect(calls.some((c) => c.url.includes("photon.komoot.io"))).toBe(true);
  });

  test("a Google place that cannot be loaded throws instead of defaulting to another city", async () => {
    global.fetch = jest.fn(async (url: string) => {
      calls.push({ url });
      return jsonResponse(500, { error: { status: "INTERNAL" } });
    }) as unknown as typeof fetch;

    const places = loadPlaces();
    await expect(places.getPlaceDetails("ChIJ-some-google-place")).rejects.toThrow(/Couldn't load this place/);
  });

  test("autocomplete and details share one session token, which is then reset", async () => {
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("places:autocomplete")) {
        return jsonResponse(200, {
          suggestions: [{ placePrediction: { placeId: "g1", structuredFormat: { mainText: { text: "Novotel" }, secondaryText: { text: "Vijayawada" } } } }],
        });
      }
      if (url.includes("/v1/places/g1")) {
        return jsonResponse(200, {
          formattedAddress: "Novotel, MG Road, Vijayawada, Andhra Pradesh 520010",
          location: { latitude: 16.5062, longitude: 80.648 },
          addressComponents: [
            { longText: "Vijayawada", types: ["locality"] },
            { longText: "NTR", types: ["administrative_area_level_2"] },
            { longText: "Andhra Pradesh", types: ["administrative_area_level_1"] },
            { longText: "520010", types: ["postal_code"] },
          ],
        });
      }
      return jsonResponse(200, { features: [] });
    }) as unknown as typeof fetch;

    const places = loadPlaces();
    await places.searchPlaceSuggestions("novotel vij");
    await places.searchPlaceSuggestions("novotel vija");
    const loc = await places.getPlaceDetails("g1");
    expect(loc.city).toBe("Vijayawada");

    const autoTokens = calls
      .filter((c) => c.url.includes("places:autocomplete"))
      .map((c) => JSON.parse(String(c.init?.body)).sessionToken);
    const detailsUrl = calls.find((c) => c.url.includes("/v1/places/g1"))!.url;
    expect(new Set(autoTokens).size).toBe(1);
    expect(detailsUrl).toContain(`sessionToken=${autoTokens[0]}`);

    calls = [];
    await places.searchPlaceSuggestions("taj gateway");
    const nextToken = JSON.parse(String(calls.find((c) => c.url.includes("places:autocomplete"))!.init?.body)).sessionToken;
    expect(nextToken).not.toBe(autoTokens[0]);
  });
});
