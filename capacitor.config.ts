import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.caiin.quizzgame",
  appName: "Akasha",
  webDir: "dist",
  android: {
    backgroundColor: "#f3eddf",
    allowMixedContent: false,
    adjustMarginsForEdgeToEdge: "auto",
  },
};
export default config;
