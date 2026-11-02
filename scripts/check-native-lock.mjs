import { readFile } from 'node:fs/promises';

const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
const errors = [];
let count = 0;

// A Windows-only lockfile can build locally while omitting the binaries required
// on Vercel's Linux builders. Check every declared native target before building.
for (const parentName of ['rolldown', 'lightningcss']) {
  const parent = lock.packages?.[`node_modules/${parentName}`];
  if (!parent?.optionalDependencies) {
    errors.push(`Missing ${parentName} optional dependencies in package-lock.json.`);
    continue;
  }
  for (const [name, version] of Object.entries(parent.optionalDependencies)) {
    const entry = lock.packages[`node_modules/${name}`];
    if (!entry || entry.version !== version || !entry.integrity || !entry.optional) {
      errors.push(`Missing or inconsistent native dependency: ${name}@${version}`);
    }
    count++;
  }
}

if (errors.length) {
  throw new Error(`${errors.join('\n')}\nRegenerate package-lock.json in a clean checkout with optional dependencies enabled.`);
}
console.log(`Verified ${count} native dependency entries for Linux, Windows, and other supported platforms.`);
