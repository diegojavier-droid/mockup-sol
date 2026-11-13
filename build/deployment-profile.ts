import { resolve } from "node:path";
export function deploymentProfile(value: string | undefined) {
  if (value !== "original" && value !== "site-test") throw new Error("SOL_MAI_PROFILE must explicitly be original or site-test");
  return value;
}
export function deploymentAliases(profile: "original" | "site-test", root: string) {
  return { "@deployment": resolve(root, "src/deployment", profile) };
}
