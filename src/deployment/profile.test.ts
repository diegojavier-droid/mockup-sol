import {expect,test} from "bun:test";
import {deploymentProfile} from "../../build/deployment-profile";
test("only explicit build profiles are accepted",()=>{
 for(const value of [undefined,"","production","https://site.example"]) expect(()=>deploymentProfile(value)).toThrow();
 expect(deploymentProfile("original")).toBe("original");expect(deploymentProfile("site-test")).toBe("site-test");
});

import {readFileSync} from "node:fs";
import {expectedTermsVersion as originalVersion} from "./original/booking-policy";
import {expectedTermsVersion as siteVersion} from "./site-test/booking-policy";
test("frontend consent versions match their backend profile",()=>{
 expect(readFileSync(new URL("../../server/src/config/legal.ts",import.meta.url),"utf8")).toContain(originalVersion);
 expect(readFileSync(new URL("../../server/site-operating/contract.ts",import.meta.url),"utf8")).toContain(siteVersion);
 expect(originalVersion as string).not.toBe(siteVersion);
});
