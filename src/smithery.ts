// Hosted Smithery deployment entry (TypeScript runtime).
// Smithery bundles this, hosts it over streamable HTTP, runs it, and reads
// tools/list to populate capabilities. The stdio entry (index.ts) is unchanged
// and remains the npx-distributed path. Same tool, same Apify actor call.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Config the user supplies through Smithery's config UI. Marked optional so the
// build-time tool scan (which runs with empty config) can list tools; the token
// is enforced inside the handler at call time.
export const configSchema = z.object({
  apifyToken: z
    .string()
    .optional()
    .describe(
      "Your Apify API token (required to run audits). Create one free at https://console.apify.com/account/integrations.",
    ),
});

export const stateful = false;

const ACTOR_ENDPOINT =
  "https://api.apify.com/v2/acts/0tVgxI7A6o9jMlxmc/run-sync-get-dataset-items?timeout=300";
const USER_AGENT =
  "mambalabs-mcp @mambalabsdev/mcp-domain-deliverability-checker (smithery-hosted)";

// Permissive output schema: real fields with descriptions for capability quality,
// all optional/nullable with tolerant primitives so structuredContent never fails
// validation on live data. (z.object strips unknown keys, so extra fields are fine.)
const num = z.union([z.number(), z.string()]).nullable().optional();
const bool = z.union([z.boolean(), z.string()]).nullable().optional();
const str = z.string().nullable().optional();
const arr = z.array(z.any()).nullable().optional();

export default function ({ config }: { config: z.infer<typeof configSchema> }) {
  const server = new McpServer({
    name: "mamba-domain-deliverability-checker",
    version: "1.0.0",
  });

  server.registerTool(
    "check_domain_deliverability",
    {
      title: "Check Domain Deliverability",
      description:
        "Audit a domain's email deliverability and DNS health. Returns SPF, DKIM, and DMARC authentication with policy, MX records and mail provider, DNS blacklist status, catch-all detection, domain age, and a 0 to 100 health score as a flat, Clay-ready JSON row. Provide a single domain or a domains array.",
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
      outputSchema: {
        domain: str.describe("The domain that was audited."),
        spf_record: str.describe("Raw SPF TXT record, or null."),
        spf_valid: bool.describe("True if a valid v=spf1 record is present."),
        spf_policy: str.describe("SPF all qualifier: fail, softfail, neutral, pass, or null."),
        dkim_selectors_found: arr.describe("Common DKIM selectors that returned a key."),
        dkim_present: bool.describe("True if at least one common DKIM selector was found."),
        dmarc_record: str.describe("Raw DMARC TXT record, or null."),
        dmarc_policy: str.describe("DMARC policy: none, quarantine, reject, or null."),
        dmarc_valid: bool.describe("True if a valid v=DMARC1 record is present."),
        mx_records: arr.describe("MX hosts with priority."),
        has_mx: bool.describe("True if the domain has at least one MX record."),
        mail_provider: str.describe("Detected mail provider, or null."),
        catch_all: bool.describe("True if SMTP accepts a random address, or null when unknown."),
        catch_all_status: str.describe("catch_all, not_catch_all, or unknown."),
        blacklisted: bool.describe("True if listed on any checked DNS blacklist."),
        blacklists_listed: arr.describe("DNSBL zones that returned a listing."),
        blacklists_checked: arr.describe("DNSBL zones queried this run."),
        blacklist_status: str.describe("listed, clean, or unknown."),
        spam_trap_risk: str.describe("Heuristic spam-trap risk: low, medium, or high."),
        spam_trap_flags: arr.describe("Triggered spam-trap heuristics."),
        domain_age_days: num.describe("Days since registration, or null."),
        domain_age_source: str.describe("rdap, soa, or null."),
        has_website: bool.describe("True if the domain has an A or AAAA record."),
        deliverability_score: num.describe("Composite 0 to 100 deliverability score."),
        risk_level: str.describe("Overall risk: low, medium, or high."),
        run_date: str.describe("ISO timestamp of the run."),
      },
      annotations: {
        title: "Check Domain Deliverability",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ domain, domains, batchSize, skipCache, attempt_catch_all }) => {
      const token = config?.apifyToken || process.env.APIFY_TOKEN;
      if (!token) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Apify token is not set. Add apifyToken in the server configuration. Create one free at https://console.apify.com/account/integrations.",
            },
          ],
        };
      }

      if (
        (domain === undefined || domain === "") &&
        (!Array.isArray(domains) || domains.length === 0)
      ) {
        return {
          isError: true,
          content: [{ type: "text", text: "Provide at least one of domain or domains." }],
        };
      }

      const input: Record<string, unknown> = {};
      if (domain !== undefined) input.domain = domain;
      if (domains !== undefined) input.domains = domains;
      if (batchSize !== undefined) input.batchSize = batchSize;
      if (skipCache !== undefined) input.skipCache = skipCache;
      if (attempt_catch_all !== undefined) input.attempt_catch_all = attempt_catch_all;

      let response: Response;
      try {
        response = await fetch(ACTOR_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
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
            message = "Invalid Apify token. Check the apifyToken in your server configuration.";
            break;
          case 402:
            message = "Insufficient Apify credits. Check your account balance at https://console.apify.com/billing";
            break;
          case 408:
            message = "Actor run timed out after 300 seconds. Try again, or run the actor on Apify directly for longer jobs.";
            break;
          default:
            message = `Apify request failed with status ${response.status}.${detail}`;
        }
        return { isError: true, content: [{ type: "text", text: message }] };
      }

      const items = await response.json();
      const first = Array.isArray(items) && items[0] && typeof items[0] === "object" ? items[0] : {};
      return {
        content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
        structuredContent: first,
      };
    },
  );

  return server.server;
}
