import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface MilestoneAttributes {
  id: string;
  moduleId: string;
  title: string;
  instructions?: string;
  acceptanceCriteria?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface  MilestoneCreationAttributes
  extends Optional <
    MilestoneAttributes,
    "id" | "instructions" | "acceptanceCriteria"
  > {}

export class Milestone
  extends Model<MilestoneAttributes, MilestoneCreationAttributes>
  implements MilestoneAttributes
{
  declare id: string;
  declare moduleId: string;
  declare title: string;
  declare instructions?: string;
  declare acceptanceCriteria?: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Milestone {
    Milestone.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        moduleId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        instructions: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        acceptanceCriteria: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "milestones",
        timestamps: true,
        underscored: true,
      },
    );
    return Milestone;
  }
}
