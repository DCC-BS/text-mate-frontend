import { writeFileSync } from "node:fs";
import { generateEnvExample } from "../shared/types/env";

const envExample = generateEnvExample();

writeFileSync(new URL("../.env.example", import.meta.url), envExample);

console.log("✓ .env.example generated successfully");
