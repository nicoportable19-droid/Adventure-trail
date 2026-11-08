import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.adventuretrail.app",
  appName: "Adventure Trail",
  webDir: "dist",
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ["google.com"],
    },
  },
};

export default config;
