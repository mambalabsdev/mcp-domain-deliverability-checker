#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(here, "..", "package.json"), "utf8"),
) as { version: string; name: string };

// Distinctive UA so Apify run meta.userAgent marks MCP-originated runs.
const USER_AGENT = `mambalabs-mcp ${pkg.name}@${pkg.version}`;

const APIFY_TOKEN = process.env.APIFY_TOKEN;

type ToolResult = {
  isError?: boolean;
  content: Array<{ type: "text"; text: string }>;
};

// Drop undefined values so optional inputs are not sent to the actor.
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// Shared caller. actorPath is the actor's immutable Apify actor ID (a stable
// key that survives Store renames). The /v2/acts/{id} endpoint accepts it
// directly, so a Store rename never breaks these calls.
async function runActor(
  actorPath: string,
  actorLabel: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  if (!APIFY_TOKEN) {
    return { isError: true, content: [{ type: "text", text: "APIFY_TOKEN is not set. Create a token at https://console.apify.com/account/integrations and set it as the APIFY_TOKEN environment variable." }] };
  }

  const url = `https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?timeout=300`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${APIFY_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify(input),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: "text", text: `Could not reach the Apify API: ${message}` }] };
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body?.error?.message) detail = ` ${body.error.message}`;
    } catch {
      detail = "";
    }

    let message: string;
    switch (response.status) {
      case 401:
        message = "Invalid Apify token. Check your APIFY_TOKEN environment variable.";
        break;
      case 402:
        message =
          "Insufficient Apify credits. Check your account balance at https://console.apify.com/billing";
        break;
      case 408:
        message = `The ${actorLabel} run timed out after 300 seconds. Try again, or run the actor on Apify directly for longer jobs.`;
        break;
      default:
        message = `Apify request to ${actorLabel} failed with status ${response.status}.${detail}`;
    }
    return { isError: true, content: [{ type: "text", text: message }] };
  }

  const items = await response.json();
  return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
}

const server = new McpServer({
  name: "mamba-domain-deliverability-checker",
  version: pkg.version,
});

// Domain Deliverability Checker (immutable actor ID 0tVgxI7A6o9jMlxmc)
server.registerTool(
  "check_domain_deliverability",
  {
    title: "Check Domain Deliverability",
    description:
      "Audit a domain's email deliverability and DNS health. Returns SPF, DKIM, and DMARC authentication with policy, MX records and mail provider, DNS blacklist status, catch-all detection, domain age, and a 0 to 100 health score as a flat, Clay-ready JSON row. Read-only; requires an APIFY_TOKEN and consumes Apify credits per call.",
    annotations: {
      title: "Check Domain Deliverability",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      domain: z
        .string()
        .optional()
        .describe("Bare domain to audit, e.g. stripe.com. Provide this or domains."),
      domains: z
        .array(z.string())
        .optional()
        .describe("List of bare domains for batch processing. Takes precedence over domain."),
      batchSize: z
        .number()
        .optional()
        .describe("Domains audited concurrently per wave in batch mode. Default 5, maximum 10."),
      skipCache: z
        .boolean()
        .optional()
        .describe("Force a fresh audit and ignore the 24 hour result cache."),
      attempt_catch_all: z
        .boolean()
        .optional()
        .describe("Run the SMTP catch-all probe. Off by default; the Apify platform blocks port 25 so it returns unknown there."),
    },
  },
  async ({ domain, domains, batchSize, skipCache, attempt_catch_all }) => {
    if (
      (domain === undefined || domain === "") &&
      (!Array.isArray(domains) || domains.length === 0)
    ) {
      return {
        isError: true,
        content: [{ type: "text", text: "Provide at least one of domain or domains." }],
      };
    }
    return runActor(
      "0tVgxI7A6o9jMlxmc",
      "Domain Deliverability Checker",
      compact({ domain, domains, batchSize, skipCache, attempt_catch_all }),
    );
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
