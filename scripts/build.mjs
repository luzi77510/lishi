import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'dist');
if (path.dirname(target) !== path.resolve(root)) throw new Error('Unsafe build directory');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const entry of ['index.html', 'src', 'assets']) {
  await cp(path.join(root, entry), path.join(target, entry), {
    recursive: true,
    filter: source => !source.endsWith('-original.jpg'),
  });
}
console.log('Built dist/ — static website, no runtime dependencies.');
