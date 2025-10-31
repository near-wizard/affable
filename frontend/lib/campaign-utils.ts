// Helper function to generate random campaign name
export function generateRandomCampaignName(): string {
	const adjectives = ["Rapid", "Swift", "Bold", "Smart", "Bright", "Quick", "Keen", "Cool", "Fresh", "Epic"];
	const nouns = ["Launch", "Growth", "Surge", "Boost", "Wave", "Pulse", "Drive", "Spark", "Storm", "Quest"];
	const suffixes = ["2024", "Pro", "Plus", "Max", "Ultra", "Glow", "Rush", "Prime", "Blitz", "Surge"];

	const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
	const noun = nouns[Math.floor(Math.random() * nouns.length)];
	const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

	return `${adj} ${noun} ${suffix}`;
}
