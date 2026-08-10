import type { Sequelize } from "sequelize";
import { User } from "./User";
import { Session } from "./Session";
import { RefreshToken } from "./RefreshToken";
import { Course } from "./Course";
import { Enrollment } from "./Enrollment";
import { Milestone } from "./Milestone";
import { MilestoneLesson } from "./MilestoneLesson";
import { Submission } from "./Submission";
import { SubmissionLink } from "./SubmissionLink";
import { Module } from "./Module";
import { Lesson } from "./Lesson";

export { User, Session, RefreshToken, Course, Enrollment, Milestone, MilestoneLesson, Submission, SubmissionLink, Module, Lesson };

export function initModels(sequelize: Sequelize): void {
  User.initModel(sequelize);
  Session.initModel(sequelize);
  RefreshToken.initModel(sequelize);
  Course.initModel(sequelize);
  Enrollment.initModel(sequelize);
  Milestone.initModel(sequelize);
  MilestoneLesson.initModel(sequelize);
  Submission.initModel(sequelize);
  SubmissionLink.initModel(sequelize);
  Module.initModel(sequelize);
  Lesson.initModel(sequelize);

  User.hasMany(Session, { foreignKey: "userId", as: "sessions" });
  Session.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
  RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

  Session.hasMany(RefreshToken, { foreignKey: "sessionId", as: "refreshTokens" });
  RefreshToken.belongsTo(Session, { foreignKey: "sessionId", as: "session" });

  User.hasMany(Course, { foreignKey: "instructorId", as: "courses" });
  Course.belongsTo(User, { foreignKey: "instructorId", as: "instructor" });

  User.hasMany(Enrollment, { foreignKey: "studentId", as: "enrollments" });
  Enrollment.belongsTo(User, { foreignKey: "studentId", as: "student" });
  Course.hasMany(Enrollment, { foreignKey: "courseId", as: "enrollments" });
  Enrollment.belongsTo(Course, { foreignKey: "courseId", as: "course" });

  Course.hasMany(Module, { foreignKey: "courseId", as: "modules" });
  Module.belongsTo(Course, { foreignKey: "courseId", as: "course" });

  Module.hasMany(Lesson, { foreignKey: "moduleId", as: "lessons" });
  Lesson.belongsTo(Module, { foreignKey: "moduleId", as: "module" });

  Milestone.belongsTo(Module, { foreignKey: "moduleId", as: "module" });
  Module.hasMany(Milestone, { foreignKey: "moduleId", as: "milestones" });

  Milestone.belongsToMany(Lesson, { through: MilestoneLesson, foreignKey: "milestoneId", as: "lessons" });
  Lesson.belongsToMany(Milestone, { through: MilestoneLesson, foreignKey: "lessonId", as: "milestones" });

  Submission.belongsTo(Milestone, { foreignKey: "milestoneId", as: "milestone" });
  Submission.belongsTo(User, { foreignKey: "studentId", as: "student" });
  Submission.belongsTo(User, { foreignKey: "gradedBy", as: "grader" });
  Milestone.hasMany(Submission, { foreignKey: "milestoneId", as: "submissions" });

  SubmissionLink.belongsTo(Submission, { foreignKey: "submissionId", as: "submission" });
  Submission.hasMany(SubmissionLink, { foreignKey: "submissionId", as: "links" });
}
