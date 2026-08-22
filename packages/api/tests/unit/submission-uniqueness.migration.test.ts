const migration =
  require("../../src/migrations/20260822000000-add-submission-uniqueness.js") as {
    up: (queryInterface: any) => Promise<void>;
    down: (queryInterface: any) => Promise<void>;
  };

describe("submission uniqueness migration", () => {
  it("enforces one submission per student and milestone and can roll back", async () => {
    const addConstraint = jest.fn(async () => undefined);
    const removeConstraint = jest.fn(async () => undefined);
    const queryInterface = { addConstraint, removeConstraint };

    await migration.up(queryInterface);
    expect(addConstraint).toHaveBeenCalledWith("submissions", {
      fields: ["student_id", "milestone_id"],
      type: "unique",
      name: "submissions_student_id_milestone_id_key",
    });

    await migration.down(queryInterface);
    expect(removeConstraint).toHaveBeenCalledWith(
      "submissions",
      "submissions_student_id_milestone_id_key",
    );
  });
});
