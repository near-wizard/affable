import { AffiliateSDK } from "../sdk-js/index";

async function runTest() {
    const sdk = new AffiliateSDK({
        baseUrl: "http://localhost:8000",
        apiKey: "test-api-key" // replace with your actual API key
    });

    console.log("=== Creating Affiliate ===");
    const affiliate = await sdk.createAffiliate("testuser@example.com", "Test User");
    console.log("Affiliate ID:", affiliate.id);

    console.log("\n=== Creating Campaign ===");
    const campaign = await sdk.createCampaign("Local Test Campaign", affiliate.id);
    console.log("Campaign ID:", campaign.id);

    console.log("\n=== Creating Affiliate Link ===");
    const link = await sdk.createLink(campaign.id, "https://example.com/welcome");
    console.log("Link slug:", link.slug);
    console.log(`Try visiting: http://localhost:8000/l/${link.slug}`);

    console.log("\n=== Tracking Test Conversion ===");
    const conversion = await sdk.trackConversion({
        affiliateId: affiliate.id,
        amount: 49.99,
        currency: "USD",
        posthogDistinctId: "test_distinct_id"
    });
    console.log("Conversion recorded:", conversion);

    console.log("\n✅ Local test completed successfully!");
}

runTest().catch(err => {
    console.error("Error running local test:", err);
});
