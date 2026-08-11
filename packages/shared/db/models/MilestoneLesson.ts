import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface MilestoneLessonAttributes {
  id: string;
  milestoneId: string;
  lessonId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MilestoneLessonCreationAttributes
  extends Optional<MilestoneLessonAttributes, "id"> {}

export class MilestoneLesson
  extends Model<MilestoneLessonAttributes, MilestoneLessonCreationAttributes>
  implements MilestoneLessonAttributes
{
  declare id: string;
  declare milestoneId: string;
  declare lessonId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof MilestoneLesson {
    MilestoneLesson.init(
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
        lessonId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "milestone_lessons",
        timestamps: true,
        underscored: true,
      },
    );
    return MilestoneLesson;
  }
}
