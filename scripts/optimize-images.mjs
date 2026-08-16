import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const articlesDir = './src/content/articles';
const outDir = './public/images';
const mapping = JSON.parse(fs.readFileSync('./scripts/image-map.json', 'utf-8'));
fs.mkdirSync(outDir, { recursive: true });

for (const [slug, url] of Object.entries(mapping)) {
  const filePath = path.join(articlesDir, slug + '.md');
  if (!fs.existsSync(filePath)) { console.log(`- ${slug}: markdown not found, skipping`); continue; }

  const outPath = path.join(outDir, slug + '.webp');
  try {
    console.log('Downloading: ' + slug);
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buffer = Buffer.from(await res.arrayBuffer());

    await sharp(buffer)
      .resize(800, 600, { fit: 'cover' })
      .webp({ quality: 78 })
      .toFile(outPath);

    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(/^image:\s*"[^"]*"/m, 'image: "/images/' + slug + '.webp"');
    fs.writeFileSync(filePath, content);
    console.log('  Saved: ' + outPath);
  } catch (err) {
    console.error('  Failed for ' + slug + ': ' + err.message);
  }
}

console.log('Done!');
