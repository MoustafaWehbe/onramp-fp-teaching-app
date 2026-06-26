"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("milestone_lessons", {
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
      lesson_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "lessons",
          key: "id",
        },
        onDelete: "CASCADE",
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
    await queryInterface.dropTable("milestone_lessons");
  },
};