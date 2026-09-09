const AsyncStorage = require("@react-native-async-storage/async-storage").default;
const { setAuthModeForTests } = require("./src/config/authMode");

process.env.EXPO_PUBLIC_AUTH_MODE = "REAL";

beforeEach(async () => {
  setAuthModeForTests(null);
  process.env.EXPO_PUBLIC_AUTH_MODE = "REAL";
  await AsyncStorage.clear();
});

afterEach(() => {
  setAuthModeForTests(null);
  process.env.EXPO_PUBLIC_AUTH_MODE = "REAL";
});
