// Writes dist/config.js so the web app knows where the AWS backend lives.
//
// Easiest (needs the AWS CLI, logged in to the same account you deployed to):
//   node scripts/configure-frontend.mjs --stack hill-dev --region us-east-1
//
// Or pass the stack outputs yourself, in this order:
//   node scripts/configure-frontend.mjs <GraphQLApiUrl> <GraphQLApiKey> <Region> <UserPoolId> <UserPoolClientId>
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

function fromStack(stackName, region) {
  const cliArgs = ["cloudformation", "describe-stacks", "--stack-name", stackName, "--query", "Stacks[0].Outputs", "--output", "json"];
  if (region) cliArgs.push("--region", region);
  let outputs;
  try {
    outputs = JSON.parse(execFileSync("aws", cliArgs, { encoding: "utf8" }));
  } catch (error) {
    console.error(`Could not read stack "${stackName}". Is the AWS CLI installed and logged in?\n${error.message}`);
    process.exit(1);
  }
  const value = (key) => outputs.find((o) => o.OutputKey === key)?.OutputValue || "";
  return {
    graphqlUrl: value("GraphQLApiUrl"),
    apiKey: value("GraphQLApiKey"),
    region: value("Region") || region || "",
    userPoolId: value("UserPoolId"),
    userPoolClientId: value("UserPoolClientId"),
  };
}

let config;
const stack = flag("stack");
if (stack) {
  config = fromStack(stack, flag("region"));
} else {
  const [graphqlUrl, apiKey, region, userPoolId, userPoolClientId] = args;
  config = { graphqlUrl, apiKey, region, userPoolId, userPoolClientId };
}

const missing = Object.entries(config).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`Missing: ${missing.join(", ")}`);
  console.error("Usage: node scripts/configure-frontend.mjs --stack <stack-name> [--region <region>]");
  console.error("   or: node scripts/configure-frontend.mjs <GraphQLApiUrl> <GraphQLApiKey> <Region> <UserPoolId> <UserPoolClientId>");
  process.exit(2);
}

config.allowedEmailDomains = ["ucla.edu", "g.ucla.edu"];
const output = `window.HILL_CONFIG = ${JSON.stringify(config, null, 2)};\n`;
await writeFile(new URL("../dist/config.js", import.meta.url), output, "utf8");
console.log("Configured dist/config.js");
