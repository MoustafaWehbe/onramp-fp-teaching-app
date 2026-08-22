"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.addConstraint("submissions", {
      fields: ["student_id", "milestone_id"],
      type: "unique",
      name: "submissions_student_id_milestone_id_key",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      "submissions",
      "submissions_student_id_milestone_id_key",
    );
  },
};
