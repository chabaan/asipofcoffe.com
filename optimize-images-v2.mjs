import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import puppeteer from 'puppeteer';

const articlesDir = './src/content/articles';
const outDir = './public/images';
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));
console.log(`Found ${files.length} articles`);

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^image:\s*"([^"]+)"/m);
  if (!match) { console.log(`- ${file}: no image field, skipping`); continue; }

  const url = match[1];
  if (url.startsWith('/images/')) { console.log(`- ${file}: already local, skipping`); continue; }

  const slug = file.replace(/\.md$/, '');
  const outPath = path.join(outDir, slug + '.webp');

  try {
    console.log('Downloading: ' + slug);
    const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    if (!response.ok()) throw new Error('HTTP ' + response.status());
    const buffer = await response.buffer();

    await sharp(buffer)
      .resize(800, 600, { fit: 'cover' })
      .webp({ quality: 78 })
      .toFile(outPath);

    content = content.replace(match[0], 'image: "/images/' + slug + '.webp"');
    fs.writeFileSync(filePath, content);
    console.log('  Saved: ' + outPath);
  } catch (err) {
    console.error('  Failed for ' + slug + ': ' + err.message);
  }
}

await browser.close();
console.log('Done!');
