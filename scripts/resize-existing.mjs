import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const dir = './public/images';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.webp'));
console.log('Found ' + files.length + ' images to resize');

for (const file of files) {
  const filePath = path.join(dir, file);
  const buffer = fs.readFileSync(filePath);
  const tmpPath = filePath + '.tmp';

  await sharp(buffer)
    .resize(640, 480, { fit: 'cover' })
    .webp({ quality: 78 })
    .toFile(tmpPath);

  fs.renameSync(tmpPath, filePath);
  console.log('Resized: ' + file);
}

console.log('Done!');
