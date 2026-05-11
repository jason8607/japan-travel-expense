import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jasonchen.ryocho",
  appName: "旅帳",
  webDir: "out",
  server: {
    url: "https://japan-travel-expense.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
