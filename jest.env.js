const AsyncStorage = require("@react-native-async-storage/async-storage").default;

beforeEach(async () => {
  await AsyncStorage.clear();
});
