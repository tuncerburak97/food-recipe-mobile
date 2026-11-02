// Runs the voice self-check with plain Node (22.18+ strips TypeScript types by itself).
// Usage: node src/lib/voice/run-self-check.mjs
import { registerHooks } from 'node:module';

const src = new URL('../../', import.meta.url);
// Node notes that it type-strips and reparses the .ts files as modules; that is expected here.
process.removeAllListeners('warning');

// Resolve the app's "@/…" alias and extensionless relative imports to .ts files.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@/')) return next(new URL(`${specifier.slice(2)}.ts`, src).href, context);
    if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) return next(`${specifier}.ts`, context);
    return next(specifier, context);
  },
});

const { runSelfCheck } = await import('./self-check.ts');
const fails = runSelfCheck();
if (fails.length) {
  console.error(`Voice self-check: ${fails.length} failed\n  ${fails.join('\n  ')}`);
  process.exit(1);
}
console.log('Voice self-check: all passed');
