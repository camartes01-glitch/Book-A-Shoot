const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const { FileStore } = require("@expo/metro-config/build/binary-file-store");

const config = getDefaultConfig(__dirname);

// Route metro cache to local workspace directory to bypass corrupted Windows %TEMP%\metro-cache
config.cacheStores = [
  new FileStore({
    root: path.join(__dirname, ".metro-cache"),
  }),
];

// Disable experimental package exports which fails on @supabase submodules lacking exports field
config.resolver.unstable_enablePackageExports = false;

// Explicitly map @supabase submodules so Metro always resolves them reliably
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "lucide-react-native": path.resolve(__dirname, "node_modules/lucide-react-native/dist/cjs/lucide-react-native.js"),
  "@supabase/realtime-js": path.resolve(__dirname, "node_modules/@supabase/realtime-js"),
  "@supabase/auth-js": path.resolve(__dirname, "node_modules/@supabase/auth-js"),
  "@supabase/postgrest-js": path.resolve(__dirname, "node_modules/@supabase/postgrest-js"),
  "@supabase/storage-js": path.resolve(__dirname, "node_modules/@supabase/storage-js"),
  "@supabase/functions-js": path.resolve(__dirname, "node_modules/@supabase/functions-js"),
};

module.exports = config;


