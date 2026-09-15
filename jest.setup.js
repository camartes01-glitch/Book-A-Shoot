jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map();
  const api = {
    getItem: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItem: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    removeItem: jest.fn(async (key) => {
      store.delete(key);
    }),
    clear: jest.fn(async () => {
      store.clear();
    }),
  };
  return { __esModule: true, default: api, ...api };
});

jest.mock("react-native", () => ({
  Platform: {
    OS: "android",
    select: (obj) => obj.android || obj.default,
  },
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(({ scheme, path }) => `${scheme}://${path || ""}`),
}));

