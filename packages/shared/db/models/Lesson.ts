import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface LessonAttributes {
  id: string;
  moduleId: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  starterCodeUrl: string | null;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LessonCreationAttributes extends Optional<
  LessonAttributes,
  "id" | "content" | "videoUrl" | "starterCodeUrl" | "order"
> {}

export class Lesson
  extends Model<LessonAttributes, LessonCreationAttributes>
  implements LessonAttributes
{
  declare id: string;
  declare moduleId: string;
  declare title: string;
  declare content: string | null;
  declare videoUrl: string | null;
  declare starterCodeUrl: string | null;
  declare order: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Lesson {
    Lesson.init(
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
        content: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        videoUrl: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        starterCodeUrl: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        tableName: "lessons",
        timestamps: true,
        underscored: true,
      },
    );
    return Lesson;
  }
}
