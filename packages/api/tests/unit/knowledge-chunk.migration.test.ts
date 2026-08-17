const migration =
  require("../../src/migrations/20260818000000-create-knowledge-chunks.js") as {
    up: (queryInterface: any, sequelizeTypes: any) => Promise<void>;
    down: (queryInterface: any) => Promise<void>;
  };

describe("knowledge chunk migration", () => {
  it("enables pgvector and creates a 384-dimensional cosine index", async () => {
    const query = jest.fn(async () => undefined);
    const queryInterface = {
      sequelize: { query },
      createTable: jest.fn(async () => undefined),
      addIndex: jest.fn(async () => undefined),
      dropTable: jest.fn(async () => undefined),
    };
    const Sequelize = {
      UUID: "UUID",
      UUIDV4: "UUIDV4",
      STRING: jest.fn((length) => `STRING(${length})`),
      TEXT: "TEXT",
      CHAR: jest.fn((length) => `CHAR(${length})`),
      INTEGER: "INTEGER",
      DATE: "DATE",
      NOW: "NOW",
    };

    await migration.up(queryInterface, Sequelize);

    expect(query.mock.calls[0]?.[0]).toBe(
      "CREATE EXTENSION IF NOT EXISTS vector",
    );
    expect(query.mock.calls.some(([sql]) => sql.includes("vector(384)"))).toBe(
      true,
    );
    expect(
      query.mock.calls.some(
        ([sql]) =>
          sql.includes("USING hnsw") && sql.includes("vector_cosine_ops"),
      ),
    ).toBe(true);
    expect(queryInterface.createTable).toHaveBeenCalledWith(
      "knowledge_chunks",
      expect.objectContaining({
        course_id: expect.objectContaining({ allowNull: false }),
        lesson_id: expect.objectContaining({ allowNull: true }),
        resource_id: expect.objectContaining({ allowNull: true }),
      }),
    );
  });

  it("drops only the feature table on rollback", async () => {
    const queryInterface = { dropTable: jest.fn(async () => undefined) };

    await migration.down(queryInterface);

    expect(queryInterface.dropTable).toHaveBeenCalledWith("knowledge_chunks");
  });
});
