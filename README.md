# Affable

An open-source affiliate management + link tracking platform, built in the style of PostHog.
Self-host in 1 minute. Integrate via SDKs. Attribute conversions via PostHog plugins.

---

## 🚀 Quickstart

```bash
git clone https://github.com/near-wizard/affable.git
cd affable
docker-compose up -d
```

Backend will be available at: `http://localhost:8000`

---

## 📦 Install SDK (Coming soon, below reflects intended flow)

```bash
npm install @affable/sdk
```

Example:

```ts
import { AffableSDK } from "@affable/sdk";

const sdk = new AffableSDK({
  baseUrl: "http://localhost:8000",
  apiKey: process.env.AFFABLE_API_KEY!
});

(async () => {
  const affiliate = await sdk.createAffiliate("user@example.com", "Alice");
  const campaign = await sdk.createCampaign("Launch", affiliate.id);
  const link = await sdk.createLink(campaign.id, "https://myapp.com/signup");
  console.log("Affiliate link:", link.slug);
})();
```

---

## 🔌 PostHog Plugin (Coming Soon)

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
