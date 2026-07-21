import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface EnrollmentAttributes {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EnrollmentCreationAttributes
  extends Optional<EnrollmentAttributes, "id" | "enrolledAt"> {}

export class Enrollment
  extends Model<EnrollmentAttributes, EnrollmentCreationAttributes>
  implements EnrollmentAttributes
{
  declare id: string;
  declare studentId: string;
  declare courseId: string;
  declare enrolledAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Enrollment {
    Enrollment.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        studentId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        courseId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        enrolledAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "enrollments",
        timestamps: true,
        underscored: true,
      },
    );
    return Enrollment;
  }
}
