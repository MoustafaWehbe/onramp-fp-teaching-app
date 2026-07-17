import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { Landing } from "../pages/Landing";
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";
import { Settings } from "../pages/dashboard/Settings";
import { CoursesPage } from "../pages/courses/Courses";
import { CourseDetailPage } from "../pages/courses/CourseDetail";
import { InstructorDashboard } from "../pages/instructor/InstructorDashboard";
import { InstructorProfilePage } from "../pages/instructor/Profile";
import { ReviewSubmissionPage } from "../pages/instructor/ReviewSubmission";
import { SubmissionsPage } from "../pages/instructor/Submissions";
import { LessonDetails } from "../pages/lessons/LessonDetails";
import { ModuleDetails } from "../pages/modules/ModuleDetails";
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
          <Route
            path="/dashboard"
            element={<Navigate to="/courses" replace />}
          />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />

          <Route path="/modules/:id" element={<ModuleDetails />} />
          <Route path="/lessons/:id" element={<LessonDetails />} />
          <Route path="/submissions" element={<Submissions />} />

          <Route element={<RoleRoute allow="student" redirectTo="/courses" />}>
            <Route path="/grades" element={<GradesPage />} />
            <Route path="/profile" element={<StudentProfilePage />} />
            <Route
              path="/milestones/:milestoneId/submit"
              element={<SubmitMilestonePage />}
            />
          </Route>

          <Route
            element={<RoleRoute allow="instructor" redirectTo="/courses" />}
          >
            <Route
              path="/instructor/dashboard"
              element={<InstructorDashboard />}
            />
            <Route
              path="/instructor/courses"
              element={<Navigate to="/courses" replace />}
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
