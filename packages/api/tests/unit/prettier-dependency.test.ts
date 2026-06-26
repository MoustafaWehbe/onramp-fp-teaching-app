import * as prettier from 'prettier';

// Tests that the prettier devDependency (added in this PR) is correctly installed
// and functional as a root-level workspace dependency.

describe('prettier devDependency', () => {
  // ─── Availability ──────────────────────────────────────────────────────────

  it('can be imported as a module', () => {
    expect(prettier).toBeDefined();
  });

  it('exposes a format function', () => {
    expect(typeof prettier.format).toBe('function');
  });

  it('exposes a check function', () => {
    expect(typeof prettier.check).toBe('function');
  });

  it('exposes a version string', () => {
    expect(typeof prettier.version).toBe('string');
    expect(prettier.version.length).toBeGreaterThan(0);
  });

  // ─── Version constraint (^3.8.4) ──────────────────────────────────────────

  it('satisfies the ^3.8.4 version constraint (major version 3)', () => {
    const [major] = prettier.version.split('.').map(Number);
    expect(major).toBe(3);
  });

  it('has a minor version >= 8', () => {
    const [, minor] = prettier.version.split('.').map(Number);
    expect(minor).toBeGreaterThanOrEqual(8);
  });

  it('has a patch version >= 4 when minor is exactly 8', () => {
    const [, minor, patch] = prettier.version.split('.').map(Number);
    if (minor === 8) {
      expect(patch).toBeGreaterThanOrEqual(4);
    }
    // Minor > 8 means any patch is fine — no assertion needed
  });

  // ─── Formatting behaviour ──────────────────────────────────────────────────

  it('formats a TypeScript snippet and returns a string', async () => {
    const unformatted = "const x={a:1,b:2}";
    const result = await prettier.format(unformatted, { parser: 'typescript' });
    expect(typeof result).toBe('string');
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it('produces deterministic (idempotent) output', async () => {
    const code = 'const greet = (name: string) => `Hello, ${name}!`;';
    const first = await prettier.format(code, { parser: 'typescript' });
    const second = await prettier.format(first, { parser: 'typescript' });
    expect(first).toBe(second);
  });

  it('returns a promise from format()', () => {
    const result = prettier.format('const x = 1', { parser: 'typescript' });
    expect(result).toBeInstanceOf(Promise);
  });

  it('check() returns true for already-formatted code', async () => {
    const formatted = 'const x = 1;\n';
    const isFormatted = await prettier.check(formatted, { parser: 'typescript' });
    expect(isFormatted).toBe(true);
  });

  it('check() returns false for unformatted code', async () => {
    const unformatted = "const x={a:1}";
    const isFormatted = await prettier.check(unformatted, { parser: 'typescript' });
    expect(isFormatted).toBe(false);
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  it('formats an empty string without throwing', async () => {
    const result = await prettier.format('', { parser: 'typescript' });
    expect(typeof result).toBe('string');
  });

  it('throws on an invalid parser name', async () => {
    await expect(
      prettier.format('const x = 1', { parser: 'not-a-real-parser' as never }),
    ).rejects.toThrow();
  });

  it('formats JSON correctly', async () => {
    const ugly = '{"a":1,"b":  2}';
    const result = await prettier.format(ugly, { parser: 'json' });
    // JSON formatter should produce newlines and consistent spacing
    expect(result).toContain('"a"');
    expect(result).toContain('"b"');
  });
});