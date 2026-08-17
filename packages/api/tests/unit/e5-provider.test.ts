import {
  E5_EMBEDDING_DIMENSION,
  E5_MODEL_ID,
  E5_MODEL_VERSION,
  formatE5Passage,
  formatE5Query,
  MultilingualE5Provider,
} from "../../src/services/ai/rag/e5-provider";
import {
  EmbeddingConfigurationError,
  EmbeddingInferenceError,
  EmbeddingModelLoadError,
} from "../../src/services/ai/rag/embedding-provider";
import {
  embeddingToSqlVector,
  normalizeEmbedding,
} from "../../src/services/ai/rag/vector";

function tensor(rows: number[][]): { tolist: () => number[][] } {
  return { tolist: () => rows };
}

function unitVector(value = 1): number[] {
  return [
    value,
    ...Array.from({ length: E5_EMBEDDING_DIMENSION - 1 }, () => 0),
  ];
}

describe("MultilingualE5Provider", () => {
  it("adds the required passage and query prefixes", () => {
    expect(formatE5Passage("content")).toBe("passage: content");
    expect(formatE5Query("question")).toBe("query: question");
  });

  it("avoids accidental double prefixes", () => {
    expect(formatE5Passage(" passage: content ")).toBe("passage: content");
    expect(formatE5Query("passage: content")).toBe("query: content");
  });

  it("loads one lazy pipeline and reuses it across calls", async () => {
    const inference = jest.fn(async (inputs: readonly string[]) =>
      tensor(inputs.map(() => unitVector())),
    );
    const loader = jest.fn(async () => inference);
    const provider = new MultilingualE5Provider({
      pipelineLoader: loader,
      batchSize: 2,
    });

    expect(loader).not.toHaveBeenCalled();
    await provider.embedPassage("first");
    await provider.embedQuery("second");

    expect(loader).toHaveBeenCalledTimes(1);
    expect(inference).toHaveBeenNthCalledWith(1, ["passage: first"], {
      pooling: "mean",
      normalize: true,
    });
    expect(inference).toHaveBeenNthCalledWith(2, ["query: second"], {
      pooling: "mean",
      normalize: true,
    });
    expect(provider.modelId).toBe(E5_MODEL_ID);
    expect(provider.modelVersion).toBe(E5_MODEL_VERSION);
  });

  it("normalizes finite model vectors", async () => {
    const provider = new MultilingualE5Provider({
      pipelineLoader: async () => async () => tensor([unitVector(7)]),
    });

    const result = await provider.embedPassage("content");

    expect(result[0]).toBeCloseTo(1);
    expect(
      Math.sqrt(result.reduce((sum, value) => sum + value * value, 0)),
    ).toBeCloseTo(1);
  });

  it("rejects the wrong embedding dimension", async () => {
    const provider = new MultilingualE5Provider({
      pipelineLoader: async () => async () => tensor([[1, 0, 0]]),
    });

    await expect(provider.embedQuery("question")).rejects.toThrow(
      /dimension mismatch/u,
    );
  });

  it("rejects non-finite model output", async () => {
    const invalid = unitVector();
    invalid[10] = Number.NaN;
    const provider = new MultilingualE5Provider({
      pipelineLoader: async () => async () => tensor([invalid]),
    });

    await expect(provider.embedPassage("content")).rejects.toThrow(
      /non-finite/u,
    );
  });

  it("reports model loading failures clearly", async () => {
    const provider = new MultilingualE5Provider({
      pipelineLoader: async () => {
        throw new Error("cache unavailable");
      },
    });

    await expect(provider.embedQuery("question")).rejects.toBeInstanceOf(
      EmbeddingModelLoadError,
    );
  });

  it("retries a failed pipeline load and then reuses the successful pipeline", async () => {
    const inference = jest.fn(async (inputs: readonly string[]) =>
      tensor(inputs.map(() => unitVector())),
    );
    const loader = jest
      .fn()
      .mockRejectedValueOnce(new Error("cache temporarily unavailable"))
      .mockResolvedValue(inference);
    const provider = new MultilingualE5Provider({ pipelineLoader: loader });

    await expect(provider.embedQuery("first attempt")).rejects.toBeInstanceOf(
      EmbeddingModelLoadError,
    );
    await expect(provider.embedQuery("second attempt")).resolves.toEqual(
      unitVector(),
    );
    await expect(provider.embedPassage("cached pipeline")).resolves.toEqual(
      unitVector(),
    );

    expect(loader).toHaveBeenCalledTimes(2);
    expect(inference).toHaveBeenCalledTimes(2);
  });

  it("validates provider configuration", () => {
    expect(() => new MultilingualE5Provider({ batchSize: 0 })).toThrow(
      EmbeddingConfigurationError,
    );
  });
});

describe("embedding vectors", () => {
  it("rejects zero-magnitude vectors", () => {
    expect(() =>
      normalizeEmbedding(
        Array.from({ length: E5_EMBEDDING_DIMENSION }, () => 0),
        E5_EMBEDDING_DIMENSION,
      ),
    ).toThrow(EmbeddingInferenceError);
  });

  it("serializes finite vectors for parameterized SQL", () => {
    expect(embeddingToSqlVector([1, 0.5, -2])).toBe("[1,0.5,-2]");
    expect(() => embeddingToSqlVector([Number.POSITIVE_INFINITY])).toThrow(
      EmbeddingInferenceError,
    );
  });
});
