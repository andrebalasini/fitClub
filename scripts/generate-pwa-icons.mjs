// Script de geração de ícones PWA para o fitClub
// Redimensiona o ícone original para 192x192 e 512x512
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const inputPath  = join(__dirname, '../assets/fitClub_icon_gray.png');
const outputDir  = join(__dirname, '../public/icons');

// Garante que a pasta de saída existe
mkdirSync(outputDir, { recursive: true });

const sizes = [192, 512];

for (const size of sizes) {
  const outputPath = join(outputDir, `icon-${size}x${size}.png`);
  await sharp(inputPath)
    .resize(size, size, { fit: 'contain', background: { r: 7, g: 8, b: 10, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✅ Gerado: icon-${size}x${size}.png`);
}

console.log('\n🎉 Ícones PWA criados em public/icons/');
