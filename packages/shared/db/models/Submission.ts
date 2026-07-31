import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface SubmissionAttributes {
  id: string;
  milestoneId: string;
  studentId: string;
  gradedBy?: string;
  status: "draft" | "submitted" | "graded";
  score?: number;
  feedback?: string;
  submittedAt?: Date;
  gradedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SubmissionCreationAttributes
  extends Optional <
    SubmissionAttributes,
    "id" | "gradedBy" | "score" | "feedback" | "submittedAt" | "gradedAt"
  > {}

export class Submission
  extends Model<SubmissionAttributes, SubmissionCreationAttributes>
  implements SubmissionAttributes
{
  declare id: string;
  declare milestoneId: string;
  declare studentId: string;
  declare gradedBy?: string;
  declare status: "draft" | "submitted" | "graded";
  declare score?: number;
  declare feedback?: string;
  declare submittedAt?: Date;
  declare gradedAt?: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Submission {
    Submission.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        milestoneId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        studentId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        gradedBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("draft", "submitted", "graded"),
          allowNull: false,
          defaultValue: "draft",
        },
        score: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        feedback: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        submittedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        gradedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "submissions",
        timestamps: true,
        underscored: true,
      },
    );
    return Submission;
  }
}
