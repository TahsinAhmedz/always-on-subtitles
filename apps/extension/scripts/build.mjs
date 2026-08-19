import * as esbuild from 'esbuild';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');
const watch = process.argv.includes('--watch');

mkdirSync(dist, { recursive: true });
mkdirSync(join(dist, 'popup'), { recursive: true });
mkdirSync(join(dist, 'icons'), { recursive: true });

const buildOptions = {
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'chrome120',
  sourcemap: true,
  logLevel: 'info',
};

const context = await esbuild.context({
  ...buildOptions,
  entryPoints: {
    background: join(root, 'src', 'background.ts'),
    content: join(root, 'src', 'content.ts'),
    'popup/popup': join(root, 'src', 'popup', 'popup.ts'),
  },
  outdir: dist,
});

if (watch) {
  await context.watch();
  console.log('Watching extension sources...');
} else {
  await context.rebuild();
  await context.dispose();
}

cpSync(join(root, 'src', 'popup', 'popup.html'), join(dist, 'popup', 'popup.html'));
cpSync(join(root, 'src', 'popup', 'popup.css'), join(dist, 'popup', 'popup.css'));
copyFileSync(join(root, 'src', 'page-hook.js'), join(dist, 'page-hook.js'));

const manifest = JSON.parse(readFileSync(join(root, 'src', 'manifest.json'), 'utf8'));
writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));

for (const size of [16, 32, 48, 128]) {
  const source = join(root, 'src', 'icons', `icon${size}.png`);
  if (existsSync(source)) {
    copyFileSync(source, join(dist, 'icons', `icon${size}.png`));
  }
}

console.log('Extension built to dist/');
