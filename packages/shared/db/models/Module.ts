import { DataTypes, Model, type Optional, type Sequelize } from "sequelize";

export interface ModuleAttributes {
  id: string;
  courseId: string;
  title: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ModuleCreationAttributes extends Optional<
  ModuleAttributes,
  "id" | "order"
> {}

export class Module
  extends Model<ModuleAttributes, ModuleCreationAttributes>
  implements ModuleAttributes
{
  declare id: string;
  declare courseId: string;
  declare title: string;
  declare order: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Module {
    Module.init(
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
        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        tableName: "modules",
        timestamps: true,
        underscored: true,
      },
    );

    return Module;
  }
}
