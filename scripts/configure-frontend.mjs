import { writeFile } from "node:fs/promises";

const [graphqlUrl, apiKey] = process.argv.slice(2);
if (!graphqlUrl || !apiKey) {
  console.error("Usage: node scripts/configure-frontend.mjs <graphql-url> <api-key>");
  process.exit(2);
}
const output = `window.HILL_CONFIG = ${JSON.stringify({ graphqlUrl, apiKey }, null, 2)};\n`;
await writeFile(new URL("../dist/config.js", import.meta.url), output, "utf8");
console.log("Configured dist/config.js");
