const axios = require("axios");

const API_BASE = "http://localhost:8000/api";

// Helper function for redirect testing
const testRedirect = async (slug) => {
  try {
    const res = await axios.get(`http://localhost:8000/l/${slug}`, {
      maxRedirects: 0, // to see the redirect URL without following it
      validateStatus: null,
    });
    console.log(`Redirected to: ${res.headers.location}`);
  } catch (err) {
    console.error(err.message);
  }
};

const runTest = async () => {
  try {
    // 1️⃣ Create an affiliate
    const affiliateRes = await axios.post(`${API_BASE}/affiliates`, {
      name: "Carlos",
      email: "Carlos@example.com",
    });
    const affiliateId = affiliateRes.data.id;
    console.log("Affiliate created:", affiliateRes.data);

    // 2️⃣ Create a campaign
    const campaignRes = await axios.post(`${API_BASE}/campaigns`, {
      name: "Summer Launch",
      affiliate_id: affiliateId,
    });
    const campaignId = campaignRes.data.id;
    console.log("Campaign created:", campaignRes.data);

    // 3️⃣ Create an affiliate link
    const linkRes = await axios.post(`${API_BASE}/links`, {
      campaign_id: campaignId,
      target_url: "https://example.com",
    });
    const slug = linkRes.data.slug;
    console.log("Affiliate link created:", linkRes.data);

    // 4️⃣ Test redirect
    await testRedirect(slug);

    // 5️⃣ Track a conversion
    const conversionRes = await axios.post(`${API_BASE}/events/conversion`, {
      affiliate_id: affiliateId,
      amount: 100.0,
      currency: "USD",
    });
    console.log("Conversion tracked:", conversionRes.data);

  } catch (err) {
    console.error("Error in test flow:", err.response?.data || err.message);
  }
};

runTest();
