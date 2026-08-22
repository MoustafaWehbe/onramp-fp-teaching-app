import { DataTypes, Model, type Optional, type Sequelize } from "sequelize";

export type LessonResourceIndexStatus = "pending" | "ready" | "failed";

export interface LessonResourceAttributes {
  id: string;
  lessonId: string;
  title: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  fileData: Buffer;
  extractedText: string | null;
  indexStatus: LessonResourceIndexStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LessonResourceCreationAttributes extends Optional<
  LessonResourceAttributes,
  "id" | "extractedText" | "indexStatus"
> {}

export class LessonResource
  extends Model<LessonResourceAttributes, LessonResourceCreationAttributes>
  implements LessonResourceAttributes
{
  declare id: string;
  declare lessonId: string;
  declare title: string;
  declare originalFileName: string;
  declare mimeType: string;
  declare sizeBytes: number;
  declare fileData: Buffer;
  declare extractedText: string | null;
  declare indexStatus: LessonResourceIndexStatus;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof LessonResource {
    LessonResource.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        lessonId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        originalFileName: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        mimeType: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        sizeBytes: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        fileData: {
          type: DataTypes.BLOB("long"),
          allowNull: false,
        },
        extractedText: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        indexStatus: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "pending",
          validate: { isIn: [["pending", "ready", "failed"]] },
        },
      },
      {
        sequelize,
        tableName: "lesson_resources",
        timestamps: true,
        underscored: true,
        defaultScope: {
          attributes: { exclude: ["fileData", "extractedText"] },
        },
        scopes: {
          withFile: { attributes: { include: ["fileData"] } },
          withExtractedText: {
            attributes: { include: ["extractedText"] },
          },
          withContent: {
            attributes: { include: ["fileData", "extractedText"] },
          },
        },
      },
    );
    return LessonResource;
  }
}
