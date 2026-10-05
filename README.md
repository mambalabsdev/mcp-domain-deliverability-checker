# Domain Deliverability Checker MCP Server

[![Smithery](https://smithery.ai/badge/mambabuilt/mcp-domain-deliverability-checker)](https://smithery.ai/servers/mambabuilt/mcp-domain-deliverability-checker) [![Glama score](https://glama.ai/mcp/servers/mambalabsdev/mcp-domain-deliverability-checker/badges/score.svg)](https://glama.ai/mcp/servers/mambalabsdev/mcp-domain-deliverability-checker) [![MCP Registry](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.modelcontextprotocol.io%2Fv0%2Fservers%3Fsearch%3Dcom.mambabuilt%252Fmcp-domain-deliverability-checker%26limit%3D1&query=%24.servers%5B0%5D._meta%5B%22io.modelcontextprotocol.registry%2Fofficial%22%5D.status&label=mcp%20registry&color=blue)](https://registry.modelcontextprotocol.io/v0/servers?search=com.mambabuilt/mcp-domain-deliverability-checker&limit=1) [![npm version](https://img.shields.io/npm/v/@mambalabsdev/mcp-domain-deliverability-checker)](https://www.npmjs.com/package/@mambalabsdev/mcp-domain-deliverability-checker) [![npm downloads](https://img.shields.io/npm/dm/@mambalabsdev/mcp-domain-deliverability-checker)](https://www.npmjs.com/package/@mambalabsdev/mcp-domain-deliverability-checker) [![license](https://img.shields.io/github/license/mambalabsdev/mcp-domain-deliverability-checker)](https://github.com/mambalabsdev/mcp-domain-deliverability-checker/blob/main/LICENSE) [![mcpservers.org](https://img.shields.io/badge/mcpservers.org-listed-blue)](https://mcpservers.org/servers/mambalabsdev/mcp-domain-deliverability-checker)

An MCP server that exposes the Mamba Labs Domain Deliverability Checker as a single tool. Install one package and give your MCP client a way to audit any domain's email deliverability and DNS health, wrapping the Mamba Labs actor on Apify and returning Clay-ready flat JSON.

## What's Inside

- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [Example prompts](#example-prompts)
- [Tool and inputs](#tool-and-inputs)
- [Output](#output)
- [Pricing](#pricing)
- [Full actor documentation](#full-actor-documentation)
- [Mamba Labs GTM Suite](#mamba-labs-gtm-suite)
- [License](#license)

## What it does

This server gives an AI client one tool:

- `check_domain_deliverability`: audit one domain or a list of domains for SPF, DKIM, DMARC, MX, mail provider, DNS blacklist status, catch-all, domain age, and a 0 to 100 deliverability score. Results are cached for 24 hours per domain. It reads public DNS only, sends no email, and does not verify individual mailboxes.

All of the work runs on Apify. This package is a thin client that routes the tool call to the actor and hands back the result.

## Quick start

You need Node.js 18 or newer and an Apify account with an API token.

Add this to your Claude Desktop config:

```json
{
  "mcpServers": {
    "mamba-domain-deliverability-checker": {
      "command": "npx",
      "args": ["-y", "@mambalabsdev/mcp-domain-deliverability-checker"],
      "env": {
        "APIFY_TOKEN": "your-apify-token"
      }
    }
  }
}
```

Get your token at https://console.apify.com/account/integrations, paste it in, and restart Claude Desktop. The tool will be available.

## Prerequisites

- Node.js 18 or newer
- An Apify account with an API token

## Example prompts

- "Check the email deliverability of stripe.com."
- "Does github.com have SPF, DKIM, and DMARC set up, and what is its DMARC policy?"
- "Audit these domains for deliverability: stripe.com, notion.so, figma.com."
- "Is acme.com on any DNS blacklist, and what is its mail provider?"

## Tool and inputs

`check_domain_deliverability`:

- `domain` (string): bare domain to audit, e.g. stripe.com. Provide this or `domains`.
- `domains` (array): list of bare domains for batch processing. Takes precedence over `domain`.
- `batchSize` (integer): how many domains from the list are audited at the same time. 1 to 10. Default 5.
- `skipCache` (boolean): ignore the 24 hour result cache and audit again now, for example right after a DNS change. Default false.
- `attempt_catch_all` (boolean): run the SMTP catch-all probe. Off by default; the Apify platform blocks port 25, so it returns unknown there.

## Output

One flat row per domain: `domain`, `spf_record`, `spf_valid`, `spf_policy`, `dkim_selectors_found`, `dkim_present`, `dmarc_record`, `dmarc_policy`, `dmarc_valid`, `mx_records`, `has_mx`, `mail_provider`, `catch_all`, `catch_all_status`, `blacklisted`, `blacklists_listed`, `blacklists_checked`, `blacklist_status`, `spam_trap_risk`, `spam_trap_flags`, `domain_age_days`, `domain_age_source`, `has_website`, `deliverability_score`, `risk_level`, `audit_error`, and `run_date`.

## Pricing

Domain Deliverability Checker is pay per event on Apify.

| Event | Price | Fires when |
| --- | ---: | --- |
| `apify-actor-start` | $0.00005 | Once per run, on start, one event per GB of memory (minimum one). Apify's start event. |
| `apify-default-dataset-item` | $0.005 (FREE tier), down to $0.00425 on GOLD and above | Once per row written to the dataset. |

The tool starts the actor run and polls it to a finished status, so a long run is not cut off at 300 seconds. A run that does not succeed comes back as an error with its run ID and status.

## Full actor documentation

For the complete input and output reference, pricing, and run history, see the Domain Deliverability Checker actor on the Apify Store:

https://apify.com/mambalabs/domain-deliverability-checker

The wrapper calls the actor by its immutable ID `0tVgxI7A6o9jMlxmc`, so a Store rename never breaks it.

---

## Mamba Labs GTM Suite

This server is part of the **Mamba Labs GTM Suite**, a fleet of twelve specialized MCP servers for go-to-market signal intelligence, each backed by a dedicated Apify actor.

| Actor | Immutable Actor ID |
|---|---|
| [GTM Hiring Signal Scraper](https://console.apify.com/actors/D7O1SA2EqwHGsGr1P) | `D7O1SA2EqwHGsGr1P` |
| [GTM Tech Stack Signal Enrichment](https://console.apify.com/actors/qyd7nNyqFPelQViBx) | `qyd7nNyqFPelQViBx` |
| [GTM Signals Aggregator](https://console.apify.com/actors/xKdRfnfFNkdMpFuNs) | `xKdRfnfFNkdMpFuNs` |
| [Job Board Keyword Signal Scanner](https://console.apify.com/actors/4DvqpvhMR74NLcDDY) | `4DvqpvhMR74NLcDDY` |
| [Domain to LinkedIn URL Resolver](https://console.apify.com/actors/3HtnSaqPHOg1Qg5gx) | `3HtnSaqPHOg1Qg5gx` |
| [ICP Fit Scorer](https://console.apify.com/actors/W161DT8W4kW55dMFh) | `W161DT8W4kW55dMFh` |
| [Domain Deliverability Checker](https://console.apify.com/actors/0tVgxI7A6o9jMlxmc) | `0tVgxI7A6o9jMlxmc` |
| [Company Firmographic Enricher](https://console.apify.com/actors/YlUtLWjfPpqykmB8g) | `YlUtLWjfPpqykmB8g` |
| [Company Social Presence Mapper](https://console.apify.com/actors/4k6CCemkgBDz18m2h) | `4k6CCemkgBDz18m2h` |
| [Company Identity Resolver](https://console.apify.com/actors/lr8fTRAmZCBZmuwwh) | `lr8fTRAmZCBZmuwwh` |
| [Company Change-Event Feed](https://console.apify.com/actors/oX44rS0fkEJ3rXLWe) | `oX44rS0fkEJ3rXLWe` |
| [Funding & Press Signal Scanner](https://console.apify.com/actors/FS13X6dhQVgX3XOM6) | `FS13X6dhQVgX3XOM6` |

> Built by [Mamba Labs](https://github.com/mambalabsdev) | [npm](https://www.npmjs.com/org/mambalabsdev) | [Apify Store](https://apify.com/mambalabs)

## License

MIT

Built by Mamba Labs. https://apify.com/mambalabs
