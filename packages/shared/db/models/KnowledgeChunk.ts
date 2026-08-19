import pgvector from "pgvector/sequelize";
import {
  Model,
  DataTypes,
  Sequelize,
  type DataType,
  type Optional,
} from "sequelize";

pgvector.registerTypes(Sequelize);
const vectorType = (
  DataTypes as unknown as {
    VECTOR: (dimensions: number) => DataType;
  }
).VECTOR;

export type KnowledgeSourceType = "lesson" | "text" | "pdf";

export interface KnowledgeChunkAttributes {
  id: string;
  courseId: string;
  moduleId: string | null;
  lessonId: string | null;
  resourceId: string | null;
  sourceType: KnowledgeSourceType;
  sourceTitle: string;
  chunkIndex: number;
  content: string;
  contentHash: string;
  startOffset: number;
  endOffset: number;
  embedding: number[];
  embeddingModel: string;
  embeddingVersion: string;
  embeddedContentHash: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface KnowledgeChunkCreationAttributes extends Optional<
  KnowledgeChunkAttributes,
  "id" | "moduleId" | "lessonId" | "resourceId"
> {}

export class KnowledgeChunk
  extends Model<KnowledgeChunkAttributes, KnowledgeChunkCreationAttributes>
  implements KnowledgeChunkAttributes
{
  declare id: string;
  declare courseId: string;
  declare moduleId: string | null;
  declare lessonId: string | null;
  declare resourceId: string | null;
  declare sourceType: KnowledgeSourceType;
  declare sourceTitle: string;
  declare chunkIndex: number;
  declare content: string;
  declare contentHash: string;
  declare startOffset: number;
  declare endOffset: number;
  declare embedding: number[];
  declare embeddingModel: string;
  declare embeddingVersion: string;
  declare embeddedContentHash: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof KnowledgeChunk {
    KnowledgeChunk.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        courseId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        moduleId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        lessonId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        resourceId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        sourceType: {
          type: DataTypes.STRING(32),
          allowNull: false,
        },
        sourceTitle: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        chunkIndex: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        contentHash: {
          type: DataTypes.CHAR(64),
          allowNull: false,
        },
        startOffset: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        endOffset: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        embedding: {
          type: vectorType(384),
          allowNull: false,
        },
        embeddingModel: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        embeddingVersion: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        embeddedContentHash: {
          type: DataTypes.CHAR(64),
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "knowledge_chunks",
        timestamps: true,
        underscored: true,
      },
    );
    return KnowledgeChunk;
  }
}
