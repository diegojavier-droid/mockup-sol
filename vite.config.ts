import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { deploymentProfile, deploymentAliases } from "./build/deployment-profile";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const profile = deploymentProfile(process.env.SOL_MAI_PROFILE);
export default defineConfig({
  resolve: { alias: deploymentAliases(profile, process.cwd()) },
  plugins: [
    cloudflare({ configPath: profile === "site-test" ? "wrangler.site-test.jsonc" : "wrangler.jsonc", viteEnvironment: { name: "ssr" } }),
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
});
