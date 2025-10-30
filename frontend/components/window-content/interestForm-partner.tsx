"use client";

import { useState } from "react";

type PartnershipType = "Referral / Affiliate" | "Reseller / Channel" | "Co-marketing / Campaigns";

export default function PartnerInterestForm() {
  const [formData, setFormData] = useState({
    companyName: "",
    website: "",
    industry: "",
    monthlyRevenue: "",
    targetMarket: "",
    contactName: "",
    email: "",
    phone: "",
    existingPartners: "",
    goals: "",
    partnershipTypes: [] as PartnershipType[],
    referralSource: "",
  });

  const handleCheckboxChange = (type: PartnershipType) => {
    setFormData((prev) => ({
      ...prev,
      partnershipTypes: prev.partnershipTypes.includes(type)
        ? prev.partnershipTypes.filter((t) => t !== type)
        : [...prev.partnershipTypes, type],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Partner form submitted:", formData);
    alert("Form submitted! Check console for data.");
    // In production, submit to your API
  };

  const mmrOptions = [
    "< $2k",
    "$2k – $5k",
    "$5k – $8k",
    "$8k – $15k",
    "$15k – $25k",
    "$25k – $40k",
    "$40k – $75k",
    "$75k – $150k",
    "$150k – $250k",
    "$250k – $500k",
    "$500k+",
  ];

  const industryOptions = [
    "SaaS / Software",
    "E-commerce",
    "Consulting / Services",
    "Education",
    "Healthcare",
    "Other",
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-foreground mb-4">Partner Interest Form</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Company Info */}
        <div>
          <label className="block text-sm font-medium text-foreground">Company Name *</label>
          <input
            type="text"
            required
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className="mt-1 w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Website *</label>
          <input
            type="url"
            required
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="mt-1 w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Industry / Sector</label>
            <select
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="mt-1 w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select industry</option>
              {industryOptions.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Monthly Revenue (MMR)</label>
            <select
              value={formData.monthlyRevenue}
              onChange={(e) => setFormData({ ...formData, monthlyRevenue: e.target.value })}
              className="mt-1 w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select MMR</option>
              {mmrOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Target Customer / Market</label>
          <input
            type="text"
            value={formData.targetMarket}
            onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
            className="mt-1 w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., SMB SaaS companies"
          />
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Primary Contact Name *</label>
            <input
              type="text"
              required
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              className="mt-1 w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="mt-1 w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional"
          />
        </div>

        {/* Partnership Info */}
        <div>
          <label className="block text-sm font-medium text-foreground">Existing External Partners</label>
          <input
            type="number"
            min={0}
            value={formData.existingPartners}
            onChange={(e) => setFormData({ ...formData, existingPartners: e.target.value })}
            className="mt-1 w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Goals in Joining</label>
          <input
            type="text"
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
            className="mt-1 w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., increase sales, co-marketing"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Type of Partnership Interested In</label>
          <div className="flex flex-col gap-2">
            {["Referral / Affiliate", "Reseller / Channel", "Co-marketing / Campaigns"].map((type) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.partnershipTypes.includes(type as PartnershipType)}
                  onChange={() => handleCheckboxChange(type as PartnershipType)}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-blue-500"
                />
                <span className="text-foreground text-sm">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">How did you hear about us?</label>
          <input
            type="text"
            value={formData.referralSource}
            onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
            className="mt-1 w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional"
          />
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
