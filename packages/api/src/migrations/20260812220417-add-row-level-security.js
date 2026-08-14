"use strict";

module.exports = {
  async up(queryInterface) {
    // Enable RLS on submissions table
    await queryInterface.sequelize.query(
      `ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;`
    );

    // Enable RLS on submission_links table
    await queryInterface.sequelize.query(
      `ALTER TABLE submission_links ENABLE ROW LEVEL SECURITY;`
    );

    // Policy: students can only see their own submissions
    await queryInterface.sequelize.query(`
      CREATE POLICY student_submissions_policy ON submissions
      FOR ALL
      USING (
        current_setting('app.current_user_role', true) = 'instructor'
        OR student_id::text = current_setting('app.current_user_id', true)
      );
    `);

    // Policy: submission_links follow same rules as submissions
    await queryInterface.sequelize.query(`
      CREATE POLICY student_submission_links_policy ON submission_links
      FOR ALL
      USING (
        submission_id IN (
          SELECT id FROM submissions
          WHERE current_setting('app.current_user_role', true) = 'instructor'
          OR student_id::text = current_setting('app.current_user_id', true)
        )
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DROP POLICY IF EXISTS student_submissions_policy ON submissions;`
    );
    await queryInterface.sequelize.query(
      `DROP POLICY IF EXISTS student_submission_links_policy ON submission_links;`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE submission_links DISABLE ROW LEVEL SECURITY;`
    );
  },
};
