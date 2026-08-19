import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');
const outDir = join(root, 'release');

if (!existsSync(dist)) {
  console.error('Run npm run build first.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const zipPath = join(outDir, 'always-on-subtitles-extension.zip');
const output = createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

archive.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

output.on('close', () => {
  console.log(`Packaged extension to ${zipPath}`);
});

archive.pipe(output);
archive.directory(dist, false);
await archive.finalize();
