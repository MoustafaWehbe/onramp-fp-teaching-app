"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        "CREATE EXTENSION IF NOT EXISTS vector",
        { transaction },
      );

      await queryInterface.createTable(
        "knowledge_chunks",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          course_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "courses", key: "id" },
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
          },
          module_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "modules", key: "id" },
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
          },
          lesson_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "lessons", key: "id" },
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
          },
          resource_id: {
            type: Sequelize.UUID,
            allowNull: true,
          },
          source_type: {
            type: Sequelize.STRING(32),
            allowNull: false,
          },
          source_title: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          chunk_index: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          content: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          content_hash: {
            type: Sequelize.CHAR(64),
            allowNull: false,
          },
          start_offset: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          end_offset: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          embedding_model: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          embedding_version: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          embedded_content_hash: {
            type: Sequelize.CHAR(64),
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
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        'ALTER TABLE "knowledge_chunks" ADD COLUMN "embedding" vector(384) NOT NULL',
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE "knowledge_chunks"
            ADD CONSTRAINT "knowledge_chunks_source_type_check"
              CHECK ("source_type" IN ('lesson', 'text', 'pdf')),
            ADD CONSTRAINT "knowledge_chunks_chunk_index_check"
              CHECK ("chunk_index" >= 0),
            ADD CONSTRAINT "knowledge_chunks_start_offset_check"
              CHECK ("start_offset" >= 0),
            ADD CONSTRAINT "knowledge_chunks_offset_order_check"
              CHECK ("end_offset" > "start_offset"),
            ADD CONSTRAINT "knowledge_chunks_content_not_empty_check"
              CHECK (char_length("content") > 0),
            ADD CONSTRAINT "knowledge_chunks_lesson_metadata_check"
              CHECK (
                "source_type" <> 'lesson'
                OR ("module_id" IS NOT NULL AND "lesson_id" IS NOT NULL)
              )
        `,
        { transaction },
      );
      await queryInterface.addIndex("knowledge_chunks", ["course_id"], {
        name: "knowledge_chunks_course_id_idx",
        transaction,
      });
      await queryInterface.addIndex("knowledge_chunks", ["lesson_id"], {
        name: "knowledge_chunks_lesson_id_idx",
        transaction,
      });
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX "knowledge_chunks_lesson_chunk_key"
            ON "knowledge_chunks" ("lesson_id", "chunk_index")
            WHERE "lesson_id" IS NOT NULL
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          CREATE INDEX "knowledge_chunks_embedding_cosine_hnsw_idx"
            ON "knowledge_chunks"
            USING hnsw ("embedding" vector_cosine_ops)
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("knowledge_chunks");
  },
};
