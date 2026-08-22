const migration = require("../../src/migrations/20260820000100-isolate-knowledge-chunk-keys.js") as {
  down: (queryInterface: any) => Promise<void>;
};

describe("knowledge chunk isolation migration rollback", () => {
  it("removes resource chunks before restoring the legacy lesson chunk index", async () => {
    const transaction = { id: "migration-transaction" };
    const query = jest.fn(async () => undefined);
    const queryInterface = {
      sequelize: { query, transaction: async (callback: (value: typeof transaction) => Promise<void>) => callback(transaction) },
      removeConstraint: jest.fn(async () => undefined),
    };

    await migration.down(queryInterface);

    const queries = query.mock.calls.map(([sql]) => sql as string);
    const deletePosition = queries.findIndex((sql) => sql.includes('DELETE FROM "knowledge_chunks" WHERE "resource_id" IS NOT NULL'));
    const indexPosition = queries.findIndex((sql) => sql.includes('CREATE UNIQUE INDEX "knowledge_chunks_lesson_chunk_key"'));
    expect(deletePosition).toBeGreaterThan(-1);
    expect(deletePosition).toBeLessThan(indexPosition);
    expect(query.mock.calls.every(([, options]) => options.transaction === transaction)).toBe(true);
  });
});
