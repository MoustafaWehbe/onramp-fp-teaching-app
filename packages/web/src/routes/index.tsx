import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { Landing } from "../pages/Landing";
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";
import { Courses } from "../pages/courses/Courses";
import { Dashboard } from "../pages/dashboard/Dashboard";
import { Settings } from "../pages/dashboard/Settings";
import { InstructorCoursesPage } from "../pages/instructor/Courses";
import { InstructorDashboard } from "../pages/instructor/InstructorDashboard";
import { InstructorProfilePage } from "../pages/instructor/Profile";
import { ReviewSubmissionPage } from "../pages/instructor/ReviewSubmission";
import { SubmissionsPage } from "../pages/instructor/Submissions";
import { LessonDetails } from "../pages/lessons/LessonDetails";
import { ModuleDetails } from "../pages/modules/ModuleDetails";
import { CoursePage } from "../pages/student/Course";
import { GradesPage } from "../pages/student/Grades";
import { StudentProfilePage } from "../pages/student/Profile";
import { SubmitMilestonePage } from "../pages/student/SubmitMilestone";
import { Submissions } from "../pages/submissions/Submissions";
import { NotFound } from "../pages/NotFound";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/settings" element={<Settings />} />

          {/* Keep the newly merged placeholder routes until their UI lands. */}
          <Route path="/courses" element={<Courses />} />
          <Route path="/modules/:id" element={<ModuleDetails />} />
          <Route path="/lessons/:id" element={<LessonDetails />} />
          <Route path="/submissions" element={<Submissions />} />

          <Route
            element={
              <RoleRoute allow="student" redirectTo="/instructor/courses" />
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/courses/:courseId" element={<CoursePage />} />
            <Route path="/grades" element={<GradesPage />} />
            <Route path="/profile" element={<StudentProfilePage />} />
            <Route
              path="/milestones/:milestoneId/submit"
              element={<SubmitMilestonePage />}
            />
          </Route>

          <Route
            element={<RoleRoute allow="instructor" redirectTo="/dashboard" />}
          >
            <Route
              path="/instructor/dashboard"
              element={<InstructorDashboard />}
            />
            <Route
              path="/instructor/courses"
              element={<InstructorCoursesPage />}
            />
            <Route
              path="/instructor/submissions"
              element={<SubmissionsPage />}
            />
            <Route
              path="/instructor/submissions/:submissionId/review"
              element={<ReviewSubmissionPage />}
            />
            <Route
              path="/instructor/profile"
              element={<InstructorProfilePage />}
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
