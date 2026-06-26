"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("submission_links", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      submission_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "submissions",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM("github", "loom", "deployment", "other"),
        allowNull: false,
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
    await queryInterface.dropTable("submission_links");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_submission_links_type";'
    );
  },
};