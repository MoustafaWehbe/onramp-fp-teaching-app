"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("submissions", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      milestone_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "milestones",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      student_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      graded_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.ENUM("draft", "submitted", "graded"),
        allowNull: false,
        defaultValue: "draft",
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      graded_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("submissions");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_submissions_status";'
    );
  },
};