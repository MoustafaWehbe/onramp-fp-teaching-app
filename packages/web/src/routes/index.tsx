import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleProtectedRoute } from "./RoleProtectedRoute";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";
import { Dashboard } from "../pages/dashboard/Dashboard";
import { Settings } from "../pages/dashboard/Settings";
import { Courses } from "../pages/courses/Courses";
import { CourseDetails } from "../pages/courses/CourseDetails";
import { ModuleDetails } from "../pages/modules/ModuleDetails";
import { LessonDetails } from "../pages/lessons/LessonDetails";
import { Submissions } from "../pages/submissions/Submissions";
import { Grades } from "../pages/grades/Grades";
import { InstructorDashboard } from "../pages/instructor/InstructorDashboard";
import { InstructorCourses } from "../pages/instructor/InstructorCourses";
import { NotFound } from "../pages/NotFound";

export function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetails />} />
          <Route path="/modules/:id" element={<ModuleDetails />} />
          <Route path="/lessons/:id" element={<LessonDetails />} />
          <Route path="/submissions" element={<Submissions />} />
          <Route path="/grades" element={<Grades />} />

          <Route
            element={
              <RoleProtectedRoute allowedRoles={["instructor", "admin"]} />
            }
          >
            <Route
              path="/instructor/dashboard"
              element={<InstructorDashboard />}
            />
            <Route path="/instructor/courses" element={<InstructorCourses />} />
          </Route>

          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
