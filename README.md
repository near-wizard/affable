# Affiliate Platform

An open-source affiliate management + link tracking platform, built in the style of PostHog.
Self-host in 1 minute. Integrate via SDKs. Attribute conversions via PostHog plugins.

---

## 🚀 Quickstart

```bash
git clone https://github.com/affiliate-hq/affiliate-platform.git
cd affiliate-platform
docker-compose up -d
```

Backend will be available at: `http://localhost:8000`

---

## 📦 Install SDK

```bash
npm install @affiliate/sdk
```

Example:

```ts
import { AffiliateSDK } from "@affiliate/sdk";

const sdk = new AffiliateSDK({
  baseUrl: "http://localhost:8000",
  apiKey: process.env.AFFILIATE_API_KEY!
});

(async () => {
  const affiliate = await sdk.createAffiliate("user@example.com", "Alice");
  const campaign = await sdk.createCampaign("Launch", affiliate.id);
  const link = await sdk.createLink(campaign.id, "https://myapp.com/signup");
  console.log("Affiliate link:", link.slug);
})();
```

---

## 🔌 PostHog Plugin

Enable the plugin inside PostHog, configure:

- `apiBaseUrl`: `http://localhost:8000`
- `apiKey`: your service API key

Plugin will forward conversion events (`purchase`, `signup`) into the affiliate backend.

---

## 🏗️ Repo Structure

```
affiliate-platform/
├── backend/              # FastAPI backend (link tracking, API)
├── sdk-js/               # JS/TS SDK
├── plugin-posthog/       # PostHog attribution plugin
├── docker-compose.yml    # Self-host infra
├── docs/                 # Developer + setup docs
└── examples/             # Example integrations
```

---

## 🌍 Philosophy

- OSS-first
- Self-host by default
- Developer experience focus
- Built to integrate naturally with PostHog

---
