import * as fs from 'fs';
import * as path from 'path';

const ERD_PATH = path.resolve(__dirname, '../../../../docs/ERD.md');

describe('docs/ERD.md', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(ERD_PATH, 'utf8');
  });

  // ─── File existence and basic structure ───────────────────────────────────

  it('exists at docs/ERD.md', () => {
    expect(fs.existsSync(ERD_PATH)).toBe(true);
  });

  it('is not empty', () => {
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it('contains the top-level heading', () => {
    expect(content).toMatch(/^# Entity Relationship Diagram/m);
  });

  it('contains a ## Tables section', () => {
    expect(content).toMatch(/^## Tables/m);
  });

  it('contains a ## Schema section', () => {
    expect(content).toMatch(/^## Schema/m);
  });

  // ─── Tables list ──────────────────────────────────────────────────────────

  const expectedTables = [
    'users',
    'courses',
    'modules',
    'lessons',
    'milestones',
    'milestone_lessons',
    'enrollments',
    'submissions',
    'submission_links',
  ];

  it('lists all 9 tables in the Tables section', () => {
    const tablesSection = content.split('## Schema')[0];
    for (const table of expectedTables) {
      expect(tablesSection).toContain(`- ${table}`);
    }
  });

  it('does not list unlisted tables in the Tables section', () => {
    const tablesSection = content.split('## Schema')[0];
    const listedItems = tablesSection.match(/^- \S+/gm) ?? [];
    expect(listedItems).toHaveLength(9);
  });

  // ─── Schema Table definitions ─────────────────────────────────────────────

  it.each(expectedTables)('has a Table definition for %s', (tableName) => {
    expect(content).toMatch(new RegExp(`^Table ${tableName} \\{`, 'm'));
  });

  it('defines exactly 9 Table blocks', () => {
    const tableBlocks = content.match(/^Table \w+ \{/gm) ?? [];
    expect(tableBlocks).toHaveLength(9);
  });

  // ─── Primary keys ─────────────────────────────────────────────────────────

  it.each(expectedTables)('%s has an id uuid primary key', (tableName) => {
    const tableBlock = extractTableBlock(content, tableName);
    expect(tableBlock).toMatch(/id\s+uuid\s+\[pk\]/);
  });

  // ─── Timestamps ───────────────────────────────────────────────────────────

  it.each(expectedTables)('%s has a created_at timestamp', (tableName) => {
    const tableBlock = extractTableBlock(content, tableName);
    expect(tableBlock).toMatch(/created_at\s+timestamp/);
  });

  it.each(expectedTables)('%s has an updated_at timestamp', (tableName) => {
    const tableBlock = extractTableBlock(content, tableName);
    expect(tableBlock).toMatch(/updated_at\s+timestamp/);
  });

  // ─── Foreign key relationships ────────────────────────────────────────────

  it('courses references users via instructor_id', () => {
    const tableBlock = extractTableBlock(content, 'courses');
    expect(tableBlock).toMatch(/instructor_id\s+uuid\s+\[ref:\s*>\s*users\.id\]/);
  });

  it('modules references courses via course_id', () => {
    const tableBlock = extractTableBlock(content, 'modules');
    expect(tableBlock).toMatch(/course_id\s+uuid\s+\[ref:\s*>\s*courses\.id\]/);
  });

  it('lessons references modules via module_id', () => {
    const tableBlock = extractTableBlock(content, 'lessons');
    expect(tableBlock).toMatch(/module_id\s+uuid\s+\[ref:\s*>\s*modules\.id\]/);
  });

  it('milestones references modules via module_id', () => {
    const tableBlock = extractTableBlock(content, 'milestones');
    expect(tableBlock).toMatch(/module_id\s+uuid\s+\[ref:\s*>\s*modules\.id\]/);
  });

  it('milestone_lessons references milestones via milestone_id', () => {
    const tableBlock = extractTableBlock(content, 'milestone_lessons');
    expect(tableBlock).toMatch(/milestone_id\s+uuid\s+\[ref:\s*>\s*milestones\.id\]/);
  });

  it('milestone_lessons references lessons via lesson_id', () => {
    const tableBlock = extractTableBlock(content, 'milestone_lessons');
    expect(tableBlock).toMatch(/lesson_id\s+uuid\s+\[ref:\s*>\s*lessons\.id\]/);
  });

  it('enrollments references users via student_id', () => {
    const tableBlock = extractTableBlock(content, 'enrollments');
    expect(tableBlock).toMatch(/student_id\s+uuid\s+\[ref:\s*>\s*users\.id\]/);
  });

  it('enrollments references courses via course_id', () => {
    const tableBlock = extractTableBlock(content, 'enrollments');
    expect(tableBlock).toMatch(/course_id\s+uuid\s+\[ref:\s*>\s*courses\.id\]/);
  });

  it('submissions references milestones via milestone_id', () => {
    const tableBlock = extractTableBlock(content, 'submissions');
    expect(tableBlock).toMatch(/milestone_id\s+uuid\s+\[ref:\s*>\s*milestones\.id\]/);
  });

  it('submissions references users via student_id', () => {
    const tableBlock = extractTableBlock(content, 'submissions');
    expect(tableBlock).toMatch(/student_id\s+uuid\s+\[ref:\s*>\s*users\.id\]/);
  });

  it('submissions references users via graded_by', () => {
    const tableBlock = extractTableBlock(content, 'submissions');
    expect(tableBlock).toMatch(/graded_by\s+uuid\s+\[ref:\s*>\s*users\.id\]/);
  });

  it('submission_links references submissions via submission_id', () => {
    const tableBlock = extractTableBlock(content, 'submission_links');
    expect(tableBlock).toMatch(/submission_id\s+uuid\s+\[ref:\s*>\s*submissions\.id\]/);
  });

  // ─── Specific field checks ────────────────────────────────────────────────

  it('users table has role as an enum field', () => {
    const tableBlock = extractTableBlock(content, 'users');
    expect(tableBlock).toMatch(/role\s+enum/);
  });

  it('courses table has is_published boolean field', () => {
    const tableBlock = extractTableBlock(content, 'courses');
    expect(tableBlock).toMatch(/is_published\s+boolean/);
  });

  it('courses table has enrollment_code field', () => {
    const tableBlock = extractTableBlock(content, 'courses');
    expect(tableBlock).toMatch(/enrollment_code\s+string/);
  });

  it('lessons table has video_url and starter_code_url fields', () => {
    const tableBlock = extractTableBlock(content, 'lessons');
    expect(tableBlock).toMatch(/video_url\s+string/);
    expect(tableBlock).toMatch(/starter_code_url\s+string/);
  });

  it('lessons table has an order integer field', () => {
    const tableBlock = extractTableBlock(content, 'lessons');
    expect(tableBlock).toMatch(/order\s+integer/);
  });

  it('milestones table has acceptance_criteria text field', () => {
    const tableBlock = extractTableBlock(content, 'milestones');
    expect(tableBlock).toMatch(/acceptance_criteria\s+text/);
  });

  it('submissions table has status enum field', () => {
    const tableBlock = extractTableBlock(content, 'submissions');
    expect(tableBlock).toMatch(/status\s+enum/);
  });

  it('submissions table has score integer field', () => {
    const tableBlock = extractTableBlock(content, 'submissions');
    expect(tableBlock).toMatch(/score\s+integer/);
  });

  it('submissions table has submitted_at and graded_at timestamps', () => {
    const tableBlock = extractTableBlock(content, 'submissions');
    expect(tableBlock).toMatch(/submitted_at\s+timestamp/);
    expect(tableBlock).toMatch(/graded_at\s+timestamp/);
  });

  it('submission_links table has type enum field', () => {
    const tableBlock = extractTableBlock(content, 'submission_links');
    expect(tableBlock).toMatch(/type\s+enum/);
  });

  it('enrollments table has enrolled_at timestamp field', () => {
    const tableBlock = extractTableBlock(content, 'enrollments');
    expect(tableBlock).toMatch(/enrolled_at\s+timestamp/);
  });

  // ─── Regression: no undefined table references ─────────────────────────────

  it('all ref targets point to tables defined in the schema', () => {
    const refs = [...content.matchAll(/\[ref:\s*>\s*(\w+)\.\w+\]/g)].map((m) => m[1]);
    for (const refTarget of refs) {
      expect(expectedTables).toContain(refTarget);
    }
  });
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function extractTableBlock(content: string, tableName: string): string {
  const start = content.indexOf(`Table ${tableName} {`);
  if (start === -1) return '';
  const end = content.indexOf('}', start);
  return content.slice(start, end + 1);
}