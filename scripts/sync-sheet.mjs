import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import Papa from 'papaparse';

// ============================================
// CONFIGURATION
// ============================================
const SHEET_ID = '17kEmWiGtF7Z8UfnZfSLniZS54pFm0JS6GB7sqannXu4';
const SHEET_GID = '315909196'; // "Article" tab
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const ARTICLES_DIR = './src/content/articles';
const IMAGES_DIR = './public/images';

function slugify(title) {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

function slugFromUrl(url) {
	if (!url) return null;
	const m = url.match(/\/([^/]+)\/?$/);
	return m ? m[1] : null;
}

async function main() {
	console.log('Fetching sheet CSV...');
	const res = await fetch(CSV_URL);
	if (!res.ok) {
		throw new Error(`Failed to fetch sheet: HTTP ${res.status}`);
	}
	const csvText = await res.text();
	const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
	const rows = parsed.data;
	console.log(`Found ${rows.length} rows in sheet`);

	fs.mkdirSync(ARTICLES_DIR, { recursive: true });
	fs.mkdirSync(IMAGES_DIR, { recursive: true });

	const now = new Date();
	let published = 0;
	let skippedFuture = 0;
	let skippedNoTitle = 0;
	let skippedExists = 0;

	for (const row of rows) {
		const title = (row['Article Title'] || '').trim();
		if (!title) { skippedNoTitle++; continue; }

		const publishDateStr = (row['Publish Date'] || '').trim();
		if (publishDateStr) {
			const publishDate = new Date(publishDateStr);
			if (!isNaN(publishDate) && publishDate > now) {
				skippedFuture++;
				continue; // not time yet
			}
		}

		const url = (row['Article URL'] || '').trim();
		const slug = slugFromUrl(url) || slugify(title);
		const mdPath = path.join(ARTICLES_DIR, slug + '.md');

		if (fs.existsSync(mdPath)) {
			skippedExists++;
			continue; // already published, don't touch
		}

		const content = row['Article Content'] || '';
		const meta = (row['Meta Description'] || '').slice(0, 160);
		const category = row['Category'] || 'Coffee Recipes';
		const author = row['Author'] || 'Staff';
		const imageUrl = row['Featured Image URL'] || '';

		let localImagePath = imageUrl;
		if (imageUrl) {
			try {
				const imgRes = await fetch(imageUrl);
				if (imgRes.ok) {
					const buffer = Buffer.from(await imgRes.arrayBuffer());
					const outPath = path.join(IMAGES_DIR, slug + '.webp');
					await sharp(buffer).resize(640, 480, { fit: 'cover' }).webp({ quality: 78 }).toFile(outPath);
					localImagePath = '/images/' + slug + '.webp';
					console.log(`  Image downloaded: ${slug}`);
				}
			} catch (err) {
				console.log(`  Image download failed for ${slug}: ${err.message}`);
			}
		}

		const esc = (s) => String(s).replace(/"/g, '\\"');
		const pubDateIso = publishDateStr ? new Date(publishDateStr).toISOString() : now.toISOString();

		const frontmatter = `---
title: "${esc(title)}"
meta: "${esc(meta)}"
category: "${esc(category)}"
author: "${esc(author)}"
image: "${esc(localImagePath)}"
pubDate: "${pubDateIso}"
---

`;
		fs.writeFileSync(mdPath, frontmatter + content);
		console.log(`  Published: ${slug}`);
		published++;
	}

	console.log('\n--- Summary ---');
	console.log('Newly published:', published);
	console.log('Skipped (future date):', skippedFuture);
	console.log('Skipped (already exists):', skippedExists);
	console.log('Skipped (no title):', skippedNoTitle);

	// Signal to the workflow whether there's anything new
	if (published > 0) {
		fs.writeFileSync('.sync-changed', 'true');
	}
}

main().catch((err) => {
	console.error('Sync failed:', err);
	process.exit(1);
});
