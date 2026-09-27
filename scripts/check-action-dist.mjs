import { access } from 'node:fs/promises';

try {
  await access(new URL('../dist/action/index.js', import.meta.url));
  await access(new URL('../dist/action/package.json', import.meta.url));
} catch {
  console.error('Missing bundled Action distribution. Run npm run build.');
  process.exit(1);
}
