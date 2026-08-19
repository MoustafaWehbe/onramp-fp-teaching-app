import type { Sequelize } from "sequelize";
import { QueryTypes } from "sequelize";
import { getDatabase } from "../../../lib/db";
import type {
  CourseOverviewResult,
  InstructorToolContext,
  MilestoneSubmissionStats,
  MissingSubmissionItem,
  PendingMilestoneCount,
  PendingSubmissionItem,
} from "./instructor-tool.types";

type CountValue = number | string;

interface CourseOverviewRow {
  courseId: string;
  title: string;
  isPublished: boolean;
  enrolledStudents: CountValue;
  modules: CountValue;
  lessons: CountValue;
  milestones: CountValue;
  submissions: CountValue;
}

interface PendingMilestoneRow {
  milestoneId: string;
  milestoneTitle: string;
  pendingCount: CountValue;
}

interface PendingSubmissionRow extends Omit<
  PendingSubmissionItem,
  "submittedAt"
> {
  submittedAt: Date | string | null;
}

interface MilestoneStatsRow extends Omit<
  MilestoneSubmissionStats,
  | "enrolledStudents"
  | "draftSubmissions"
  | "submittedSubmissions"
  | "gradedSubmissions"
  | "missingStudents"
> {
  enrolledStudents: CountValue;
  draftSubmissions: CountValue;
  submittedSubmissions: CountValue;
  gradedSubmissions: CountValue;
  missingStudents: CountValue;
}

interface MissingSubmissionRow extends MissingSubmissionItem {
  totalMissing: CountValue;
}

export interface InstructorAnalyticsRepository {
  getCourseOverview(
    context: InstructorToolContext,
  ): Promise<CourseOverviewResult | null>;
  listPendingMilestones(
    context: InstructorToolContext,
  ): Promise<PendingMilestoneCount[]>;
  listPendingSubmissions(
    context: InstructorToolContext,
    limit: number,
  ): Promise<PendingSubmissionItem[]>;
  listMilestoneStats(
    context: InstructorToolContext,
  ): Promise<MilestoneSubmissionStats[]>;
  findMilestone(
    context: InstructorToolContext,
    milestoneId: string,
  ): Promise<{ id: string; title: string } | null>;
  listMissingSubmissions(
    context: InstructorToolContext,
    milestoneId: string | undefined,
    limit: number,
  ): Promise<{ total: number; rows: MissingSubmissionItem[] }>;
}

function count(value: CountValue): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("Database returned an invalid aggregate count");
  }
  return parsed;
}

function dateTime(value: Date | string | null): string | null {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function createInstructorAnalyticsRepository(
  database: Pick<Sequelize, "query"> = getDatabase(),
): InstructorAnalyticsRepository {
  return {
    async getCourseOverview(context) {
      const rows = await database.query<CourseOverviewRow>(
        `
          SELECT
            course."id" AS "courseId",
            course."title",
            course."is_published" AS "isPublished",
            (
              SELECT COUNT(*)::integer
              FROM "enrollments" AS enrollment
              WHERE enrollment."course_id" = course."id"
            ) AS "enrolledStudents",
            (
              SELECT COUNT(*)::integer
              FROM "modules" AS module_count
              WHERE module_count."course_id" = course."id"
            ) AS "modules",
            (
              SELECT COUNT(*)::integer
              FROM "lessons" AS lesson
              INNER JOIN "modules" AS lesson_module
                ON lesson_module."id" = lesson."module_id"
              WHERE lesson_module."course_id" = course."id"
            ) AS "lessons",
            (
              SELECT COUNT(*)::integer
              FROM "milestones" AS milestone
              INNER JOIN "modules" AS milestone_module
                ON milestone_module."id" = milestone."module_id"
              WHERE milestone_module."course_id" = course."id"
            ) AS "milestones",
            (
              SELECT COUNT(*)::integer
              FROM "submissions" AS submission
              INNER JOIN "milestones" AS submission_milestone
                ON submission_milestone."id" = submission."milestone_id"
              INNER JOIN "modules" AS submission_module
                ON submission_module."id" = submission_milestone."module_id"
              WHERE submission_module."course_id" = course."id"
            ) AS "submissions"
          FROM "courses" AS course
          WHERE course."id" = CAST(:courseId AS uuid)
            AND course."instructor_id" = CAST(:instructorId AS uuid)
          LIMIT 1
        `,
        {
          replacements: {
            courseId: context.courseId,
            instructorId: context.instructorId,
          },
          type: QueryTypes.SELECT,
        },
      );
      const row = rows[0];
      if (!row) return null;

      return {
        courseId: row.courseId,
        title: row.title,
        state: row.isPublished ? "published" : "draft",
        enrolledStudents: count(row.enrolledStudents),
        modules: count(row.modules),
        lessons: count(row.lessons),
        milestones: count(row.milestones),
        submissions: count(row.submissions),
      };
    },

    async listPendingMilestones(context) {
      const rows = await database.query<PendingMilestoneRow>(
        `
          SELECT
            milestone."id" AS "milestoneId",
            milestone."title" AS "milestoneTitle",
            COUNT(submission."id")::integer AS "pendingCount"
          FROM "milestones" AS milestone
          INNER JOIN "modules" AS module
            ON module."id" = milestone."module_id"
          INNER JOIN "courses" AS course
            ON course."id" = module."course_id"
          INNER JOIN "submissions" AS submission
            ON submission."milestone_id" = milestone."id"
           AND submission."status" = 'submitted'
          WHERE course."id" = CAST(:courseId AS uuid)
            AND course."instructor_id" = CAST(:instructorId AS uuid)
          GROUP BY milestone."id", milestone."title"
          ORDER BY "pendingCount" DESC, milestone."title" ASC, milestone."id" ASC
        `,
        {
          replacements: {
            courseId: context.courseId,
            instructorId: context.instructorId,
          },
          type: QueryTypes.SELECT,
        },
      );

      return rows.map((row) => ({
        milestoneId: row.milestoneId,
        milestoneTitle: row.milestoneTitle,
        pendingCount: count(row.pendingCount),
      }));
    },

    async listPendingSubmissions(context, limit) {
      const rows = await database.query<PendingSubmissionRow>(
        `
          SELECT
            submission."id" AS "submissionId",
            student."id" AS "studentId",
            student."name" AS "studentName",
            milestone."id" AS "milestoneId",
            milestone."title" AS "milestoneTitle",
            submission."submitted_at" AS "submittedAt"
          FROM "submissions" AS submission
          INNER JOIN "users" AS student
            ON student."id" = submission."student_id"
          INNER JOIN "milestones" AS milestone
            ON milestone."id" = submission."milestone_id"
          INNER JOIN "modules" AS module
            ON module."id" = milestone."module_id"
          INNER JOIN "courses" AS course
            ON course."id" = module."course_id"
          WHERE course."id" = CAST(:courseId AS uuid)
            AND course."instructor_id" = CAST(:instructorId AS uuid)
            AND submission."status" = 'submitted'
          ORDER BY submission."submitted_at" ASC NULLS LAST, submission."id" ASC
          LIMIT :limit
        `,
        {
          replacements: { ...context, limit },
          type: QueryTypes.SELECT,
        },
      );

      return rows.map((row) => ({
        ...row,
        submittedAt: dateTime(row.submittedAt),
      }));
    },

    async listMilestoneStats(context) {
      const rows = await database.query<MilestoneStatsRow>(
        `
          SELECT
            milestone."id" AS "milestoneId",
            milestone."title" AS "milestoneTitle",
            (
              SELECT COUNT(*)::integer
              FROM "enrollments" AS enrollment_count
              WHERE enrollment_count."course_id" = course."id"
            ) AS "enrolledStudents",
            COUNT(submission."id") FILTER (
              WHERE submission."status" = 'draft'
            )::integer AS "draftSubmissions",
            COUNT(submission."id") FILTER (
              WHERE submission."status" = 'submitted'
            )::integer AS "submittedSubmissions",
            COUNT(submission."id") FILTER (
              WHERE submission."status" = 'graded'
            )::integer AS "gradedSubmissions",
            GREATEST(
              (
                SELECT COUNT(*)
                FROM "enrollments" AS enrolled_student
                WHERE enrolled_student."course_id" = course."id"
              ) - COUNT(DISTINCT submission."student_id") FILTER (
                WHERE submission."status" IN ('submitted', 'graded')
                  AND EXISTS (
                    SELECT 1
                    FROM "enrollments" AS qualifying_enrollment
                    WHERE qualifying_enrollment."course_id" = course."id"
                      AND qualifying_enrollment."student_id" = submission."student_id"
                  )
              ),
              0
            )::integer AS "missingStudents"
          FROM "milestones" AS milestone
          INNER JOIN "modules" AS module
            ON module."id" = milestone."module_id"
          INNER JOIN "courses" AS course
            ON course."id" = module."course_id"
          LEFT JOIN "submissions" AS submission
            ON submission."milestone_id" = milestone."id"
          WHERE course."id" = CAST(:courseId AS uuid)
            AND course."instructor_id" = CAST(:instructorId AS uuid)
          GROUP BY milestone."id", milestone."title", course."id"
          ORDER BY milestone."title" ASC, milestone."id" ASC
        `,
        {
          replacements: {
            courseId: context.courseId,
            instructorId: context.instructorId,
          },
          type: QueryTypes.SELECT,
        },
      );

      return rows.map((row) => ({
        milestoneId: row.milestoneId,
        milestoneTitle: row.milestoneTitle,
        enrolledStudents: count(row.enrolledStudents),
        draftSubmissions: count(row.draftSubmissions),
        submittedSubmissions: count(row.submittedSubmissions),
        gradedSubmissions: count(row.gradedSubmissions),
        missingStudents: count(row.missingStudents),
      }));
    },

    async findMilestone(context, milestoneId) {
      const rows = await database.query<{ id: string; title: string }>(
        `
          SELECT milestone."id", milestone."title"
          FROM "milestones" AS milestone
          INNER JOIN "modules" AS module
            ON module."id" = milestone."module_id"
          INNER JOIN "courses" AS course
            ON course."id" = module."course_id"
          WHERE milestone."id" = CAST(:milestoneId AS uuid)
            AND course."id" = CAST(:courseId AS uuid)
            AND course."instructor_id" = CAST(:instructorId AS uuid)
          LIMIT 1
        `,
        {
          replacements: { ...context, milestoneId },
          type: QueryTypes.SELECT,
        },
      );
      return rows[0] ?? null;
    },

    async listMissingSubmissions(context, milestoneId, limit) {
      const rows = await database.query<MissingSubmissionRow>(
        `
          SELECT
            student."id" AS "studentId",
            student."name" AS "studentName",
            milestone."id" AS "milestoneId",
            milestone."title" AS "milestoneTitle",
            COUNT(*) OVER()::integer AS "totalMissing"
          FROM "enrollments" AS enrollment
          INNER JOIN "users" AS student
            ON student."id" = enrollment."student_id"
          INNER JOIN "courses" AS course
            ON course."id" = enrollment."course_id"
          INNER JOIN "modules" AS module
            ON module."course_id" = course."id"
          INNER JOIN "milestones" AS milestone
            ON milestone."module_id" = module."id"
          LEFT JOIN "submissions" AS qualifying_submission
            ON qualifying_submission."student_id" = student."id"
           AND qualifying_submission."milestone_id" = milestone."id"
           AND qualifying_submission."status" IN ('submitted', 'graded')
          WHERE course."id" = CAST(:courseId AS uuid)
            AND course."instructor_id" = CAST(:instructorId AS uuid)
            AND (:milestoneId IS NULL OR milestone."id" = CAST(:milestoneId AS uuid))
            AND qualifying_submission."id" IS NULL
          ORDER BY milestone."title" ASC, student."name" ASC,
            milestone."id" ASC, student."id" ASC
          LIMIT :limit
        `,
        {
          replacements: { ...context, milestoneId: milestoneId ?? null, limit },
          type: QueryTypes.SELECT,
        },
      );
      return {
        total: rows[0] ? count(rows[0].totalMissing) : 0,
        rows: rows.map(
          ({ totalMissing: _totalMissing, ...missingSubmission }) =>
            missingSubmission,
        ),
      };
    },
  };
}
