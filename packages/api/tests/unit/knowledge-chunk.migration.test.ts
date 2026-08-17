const migration =
  require("../../src/migrations/20260818000000-create-knowledge-chunks.js") as {
    up: (queryInterface: any, sequelizeTypes: any) => Promise<void>;
    down: (queryInterface: any) => Promise<void>;
  };

describe("knowledge chunk migration", () => {
  it("enables pgvector and creates a 384-dimensional cosine index", async () => {
    const transaction = { id: "migration-transaction" };
    const query = jest.fn(
      async (_sql: string, _options?: { transaction: unknown }) => undefined,
    );
    const runTransaction = jest.fn(
      async (callback: (value: typeof transaction) => Promise<void>) =>
        callback(transaction),
    );
    const queryInterface = {
      sequelize: { query, transaction: runTransaction },
      createTable: jest.fn(
        async (
          _name: string,
          _attributes: unknown,
          _options?: { transaction: unknown },
        ) => undefined,
      ),
      addIndex: jest.fn(
        async (
          _table: string,
          _fields: string[],
          _options?: { transaction: unknown },
        ) => undefined,
      ),
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

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toBe(
      "CREATE EXTENSION IF NOT EXISTS vector",
    );
    expect(
      query.mock.calls.every((call) => call[1]?.transaction === transaction),
    ).toBe(true);
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
      { transaction },
    );
    expect(
      queryInterface.addIndex.mock.calls.every(
        (call) => call[2]?.transaction === transaction,
      ),
    ).toBe(true);
  });

  it("propagates a failed transactional step without running later DDL", async () => {
    const transaction = { id: "migration-transaction" };
    let rolledBack = false;
    const failure = new Error("constraint creation failed");
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("knowledge_chunks_source_type_check")) throw failure;
    });
    const runTransaction = jest.fn(
      async (callback: (value: typeof transaction) => Promise<void>) => {
        try {
          await callback(transaction);
        } catch (error) {
          rolledBack = true;
          throw error;
        }
      },
    );
    const queryInterface = {
      sequelize: { query, transaction: runTransaction },
      createTable: jest.fn(async () => undefined),
      addIndex: jest.fn(async () => undefined),
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

    await expect(migration.up(queryInterface, Sequelize)).rejects.toBe(failure);

    expect(rolledBack).toBe(true);
    expect(queryInterface.addIndex).not.toHaveBeenCalled();
  });

  it("drops only the feature table on rollback", async () => {
    const queryInterface = { dropTable: jest.fn(async () => undefined) };

    await migration.down(queryInterface);

    expect(queryInterface.dropTable).toHaveBeenCalledWith("knowledge_chunks");
  });
});
