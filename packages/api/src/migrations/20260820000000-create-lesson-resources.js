"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "lesson_resources",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          lesson_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "lessons", key: "id" },
            onDelete: "CASCADE",
          },
          title: { type: Sequelize.STRING(255), allowNull: false },
          original_file_name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          mime_type: { type: Sequelize.STRING(100), allowNull: false },
          size_bytes: { type: Sequelize.INTEGER, allowNull: false },
          file_data: { type: Sequelize.BLOB("long"), allowNull: false },
          extracted_text: { type: Sequelize.TEXT, allowNull: true },
          index_status: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: "pending",
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
        },
        { transaction },
      );
      await queryInterface.addConstraint("lesson_resources", {
        fields: ["index_status"],
        type: "check",
        name: "lesson_resources_index_status_check",
        where: { index_status: ["pending", "ready", "failed"] },
        transaction,
      });
      await queryInterface.addIndex("lesson_resources", ["lesson_id"], {
        name: "lesson_resources_lesson_id_idx",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("lesson_resources");
  },
};
