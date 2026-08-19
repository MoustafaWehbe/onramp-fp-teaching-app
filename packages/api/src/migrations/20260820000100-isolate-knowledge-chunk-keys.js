"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addConstraint("knowledge_chunks", {
        fields: ["resource_id"],
        type: "foreign key",
        name: "knowledge_chunks_resource_id_fkey",
        references: { table: "lesson_resources", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "knowledge_chunks_lesson_chunk_key"',
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX "knowledge_chunks_lesson_source_chunk_key"
            ON "knowledge_chunks" ("lesson_id", "chunk_index")
            WHERE "source_type" = 'lesson' AND "resource_id" IS NULL
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX "knowledge_chunks_resource_chunk_key"
            ON "knowledge_chunks" ("resource_id", "chunk_index")
            WHERE "resource_id" IS NOT NULL
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint(
        "knowledge_chunks",
        "knowledge_chunks_resource_id_fkey",
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "knowledge_chunks_resource_chunk_key"',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "knowledge_chunks_lesson_source_chunk_key"',
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX "knowledge_chunks_lesson_chunk_key"
            ON "knowledge_chunks" ("lesson_id", "chunk_index")
            WHERE "lesson_id" IS NOT NULL
        `,
        { transaction },
      );
    });
  },
};
