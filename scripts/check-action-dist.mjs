import { access, readFile } from 'node:fs/promises';

try {
  await access(new URL('../dist/action/index.js', import.meta.url));
  await access(new URL('../dist/action/package.json', import.meta.url));
  const licenses = await readFile(new URL('../dist/action/licenses.txt', import.meta.url), 'utf8');
  if (!licenses.includes('@actions/core') || !licenses.includes('@actions/http-client')) {
    throw new Error('Bundled Action third-party licence inventory is incomplete.');
  }
} catch {
  console.error('Missing or incomplete bundled Action distribution. Run npm run build.');
  process.exit(1);
}
