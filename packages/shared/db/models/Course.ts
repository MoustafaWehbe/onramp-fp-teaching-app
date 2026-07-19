import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface CourseAttributes {
  id: string;
  instructorId: string;
  title: string;
  description?: string;
  enrollmentCode: string;
  isPublished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CourseCreationAttributes
  extends Optional <
    CourseAttributes,
    "id" | "description" | "isPublished" | "enrollmentCode"
  > {}

export class Course
  extends Model<CourseAttributes, CourseCreationAttributes>
  implements CourseAttributes
{
  declare id: string;
  declare instructorId: string;
  declare title: string;
  declare description?: string;
  declare enrollmentCode: string;
  declare isPublished: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Course {
    Course.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        instructorId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        enrollmentCode: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        isPublished: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        tableName: "courses",
        timestamps: true,
        underscored: true,
      },
    );
    return Course;
  }
}
