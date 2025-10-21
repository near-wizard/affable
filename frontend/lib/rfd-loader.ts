// lib/rfd-loader.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { RFDState } from "@/content/rfd/rfds";

export interface RFD {
	number: number;
	title: string;
	state: RFDState;
	discussion?: string;
	authors: string[];
	date: string;
	labels: string[];
	content: string;
}

const RFD_PATH = path.join(process.cwd(), "content/rfd"); // folder containing RFD markdowns

/**
 * Get all RFDs, sorted by number ascending
 */
export function getAllRFDs(): RFD[] {
	const filenames = fs.readdirSync(RFD_PATH);

	const rfds = filenames
		.filter((name) => name.endsWith(".md") && name.startsWith("rfd"))
		.map((filename) => {
			const filePath = path.join(RFD_PATH, filename);
			const fileContents = fs.readFileSync(filePath, "utf-8");

			const { data, content } = matter(fileContents);

			// extract the number: rfdXXXX.md -> XXXX
			const numberMatch = filename.match(/^rfd(\d+)\.md$/i);
			const number = numberMatch ? numberMatch[1] : "";

			return {
				number,
				slug: filename.replace(/\.md$/, ""),
				title: data.title || "",
				date: data.date || "",
				content,
				...data,
			};
		});

	// sort by number ascending
	rfds.sort((a, b) => (a.number > b.number ? 1 : -1));

	return rfds;
}

/**
 * Get a single RFD by number
 */
export function getRFDByNumber(number: string): RFD | null {
	const filename = `rfd${number}.md`;
	const filePath = path.join(RFD_PATH, filename);

	if (!fs.existsSync(filePath)) return null;

	const fileContents = fs.readFileSync(filePath, "utf-8");
	const { data, content } = matter(fileContents);

	return {
		number,
		slug: filename.replace(/\.md$/, ""),
		title: data.title || "",
		date: data.date || "",
		content,
		...data,
	};
}
