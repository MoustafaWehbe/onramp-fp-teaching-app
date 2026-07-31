import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface SubmissionLinkAttributes {
  id: string;
  submissionId: string;
  url: string;
  type: "github" | "loom" | "deployment" | "other";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SubmissionLinkCreationAttributes
  extends Optional<SubmissionLinkAttributes, "id"> {}

export class SubmissionLink
  extends Model<SubmissionLinkAttributes, SubmissionLinkCreationAttributes>
  implements SubmissionLinkAttributes
{
  declare id: string;
  declare submissionId: string;
  declare url: string;
  declare type: "github" | "loom" | "deployment" | "other";
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof SubmissionLink {
    SubmissionLink.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        submissionId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        url: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM("github", "loom", "deployment", "other"),
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "submission_links",
        timestamps: true,
        underscored: true,
      },
    );
    return SubmissionLink;
  }
}
