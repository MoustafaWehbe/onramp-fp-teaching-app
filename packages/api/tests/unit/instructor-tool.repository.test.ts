import type { Sequelize } from "sequelize";
import { createInstructorAnalyticsRepository } from "../../src/services/ai/instructor/instructor-tool.repository";

const courseId = "00000000-0000-4000-8000-000000000001";
const instructorId = "00000000-0000-4000-8000-000000000002";
const milestoneId = "00000000-0000-4000-8000-000000000003";
const context = { courseId, instructorId };

function databaseWith(query: jest.Mock) {
  return { query } as unknown as Pick<Sequelize, "query">;
}

describe("Instructor analytics repository", () => {
  it("maps a course-scoped overview without exposing broad course data", async () => {
    const query = jest.fn().mockResolvedValue([
      {
        courseId,
        title: "Secure Web Apps",
        isPublished: false,
        enrolledStudents: "3",
        modules: 2,
        lessons: 4,
        milestones: 2,
        submissions: 5,
      },
    ]);
    const repository = createInstructorAnalyticsRepository(databaseWith(query));

    await expect(repository.getCourseOverview(context)).resolves.toEqual({
      courseId,
      title: "Secure Web Apps",
      state: "draft",
      enrolledStudents: 3,
      modules: 2,
      lessons: 4,
      milestones: 2,
      submissions: 5,
    });

    const [sql, options] = query.mock.calls[0]!;
    expect(sql).toContain('course."id" = CAST(:courseId AS uuid)');
    expect(sql).toContain(
      'course."instructor_id" = CAST(:instructorId AS uuid)',
    );
    expect(sql).not.toContain(courseId);
    expect(options.replacements).toEqual(context);
  });

  it("defines pending grading as status exactly submitted", async () => {
    const countsQuery = jest.fn().mockResolvedValue([
      {
        milestoneId,
        milestoneTitle: "Authentication",
        pendingCount: 2,
      },
    ]);
    const repository = createInstructorAnalyticsRepository(
      databaseWith(countsQuery),
    );

    await repository.listPendingMilestones(context);

    const [sql, options] = countsQuery.mock.calls[0]!;
    expect(sql).toContain("submission.\"status\" = 'submitted'");
    expect(sql).not.toContain("'draft'");
    expect(sql).not.toContain("'graded'");
    expect(options.replacements).toEqual(context);
  });

  it("keeps every operational query inside both authorized scopes", async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('AS "pendingCount"')) return [];
      if (sql.includes('AS "submittedAt"')) return [];
      if (sql.includes('AS "draftSubmissions"')) return [];
      if (sql.includes('SELECT milestone."id", milestone."title"')) return [];
      if (sql.includes('AS "totalMissing"')) return [];
      return [];
    });
    const repository = createInstructorAnalyticsRepository(
      databaseWith(query as jest.Mock),
    );

    await repository.listPendingMilestones(context);
    await repository.listPendingSubmissions(context, 25);
    await repository.listMilestoneStats(context);
    await repository.findMilestone(context, milestoneId);
    await repository.listMissingSubmissions(context, milestoneId, 100);

    expect(query).toHaveBeenCalledTimes(5);
    for (const [sql, options] of query.mock.calls) {
      expect(sql).toContain('course."id" = CAST(:courseId AS uuid)');
      expect(sql).toContain(
        'course."instructor_id" = CAST(:instructorId AS uuid)',
      );
      expect(options.replacements).toMatchObject(context);
      expect(sql).not.toContain(courseId);
      expect(sql).not.toContain(instructorId);
    }
  });

  it("computes missing work only when no submitted or graded row exists", async () => {
    const query = jest.fn().mockResolvedValue([
      {
        studentId: "student-1",
        studentName: "Sam Student",
        milestoneId,
        milestoneTitle: "Authentication",
        totalMissing: 1,
      },
    ]);
    const repository = createInstructorAnalyticsRepository(databaseWith(query));

    await expect(
      repository.listMissingSubmissions(context, milestoneId, 100),
    ).resolves.toEqual({
      total: 1,
      rows: [
        {
          studentId: "student-1",
          studentName: "Sam Student",
          milestoneId,
          milestoneTitle: "Authentication",
        },
      ],
    });

    const sql = query.mock.calls[0]?.[0] as string;
    expect(sql).toContain(
      "qualifying_submission.\"status\" IN ('submitted', 'graded')",
    );
    expect(sql).toContain('qualifying_submission."id" IS NULL');
    expect(sql).not.toContain("'draft'");
    expect(sql).toContain('milestone."id" = CAST(:milestoneId AS uuid)');
  });

  it("maps per-milestone status and missing counts deterministically", async () => {
    const query = jest.fn().mockResolvedValue([
      {
        milestoneId,
        milestoneTitle: "Authentication",
        enrolledStudents: "4",
        draftSubmissions: "1",
        submittedSubmissions: "2",
        gradedSubmissions: "1",
        missingStudents: "1",
      },
    ]);
    const repository = createInstructorAnalyticsRepository(databaseWith(query));

    await expect(repository.listMilestoneStats(context)).resolves.toEqual([
      {
        milestoneId,
        milestoneTitle: "Authentication",
        enrolledStudents: 4,
        draftSubmissions: 1,
        submittedSubmissions: 2,
        gradedSubmissions: 1,
        missingStudents: 1,
      },
    ]);
  });

  it("cannot turn an authorized course request into another course filter", async () => {
    const query = jest.fn(async (_sql: string, options: any) =>
      options.replacements.courseId === courseId &&
      options.replacements.instructorId === instructorId
        ? [
            {
              courseId,
              title: "Authorized course",
              isPublished: true,
              enrolledStudents: 0,
              modules: 0,
              lessons: 0,
              milestones: 0,
              submissions: 0,
            },
          ]
        : [],
    );
    const repository = createInstructorAnalyticsRepository(
      databaseWith(query as jest.Mock),
    );

    const result = await repository.getCourseOverview(context);

    expect(result?.courseId).toBe(courseId);
    expect(JSON.stringify(result)).not.toContain(
      "00000000-0000-4000-8000-000000000999",
    );
  });
});
