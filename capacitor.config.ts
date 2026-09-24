import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.caiin.quizzgame",
  appName: "QuizzGame",
  webDir: "dist",
  android: {
    backgroundColor: "#101c19",
    allowMixedContent: false,
    adjustMarginsForEdgeToEdge: "auto",
  },
};
export default config;
