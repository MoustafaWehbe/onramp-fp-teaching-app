# Entity Relationship Diagram

## Tables
- users
- courses
- modules
- lessons
- milestones
- milestone_lessons
- enrollments
- submissions
- submission_links

## Schema

Table users {
  id uuid [pk]
  name string
  email string
  password_hash string
  role enum
  created_at timestamp
  updated_at timestamp
}

Table courses {
  id uuid [pk]
  instructor_id uuid [ref: > users.id]
  title string
  description text
  enrollment_code string
  is_published boolean
  created_at timestamp
  updated_at timestamp
}

Table modules {
  id uuid [pk]
  course_id uuid [ref: > courses.id]
  title string
  order integer
  created_at timestamp
  updated_at timestamp
}

Table lessons {
  id uuid [pk]
  module_id uuid [ref: > modules.id]
  title string
  content text
  video_url string
  starter_code_url string
  order integer
  created_at timestamp
  updated_at timestamp
}

Table milestones {
  id uuid [pk]
  module_id uuid [ref: > modules.id]
  title string
  instructions text
  acceptance_criteria text
  created_at timestamp
  updated_at timestamp
}

Table milestone_lessons {
  id uuid [pk]
  milestone_id uuid [ref: > milestones.id]
  lesson_id uuid [ref: > lessons.id]
  indexes {
    (milestone_id, lesson_id) [unique]
  }
  created_at timestamp
  updated_at timestamp
}

Table enrollments {
  id uuid [pk]
  student_id uuid [ref: > users.id]
  course_id uuid [ref: > courses.id]
  indexes {
    (student_id, course_id) [unique]
  }
  enrolled_at timestamp
  created_at timestamp
  updated_at timestamp
}

Table submissions {
  id uuid [pk]
  milestone_id uuid [ref: > milestones.id]
  student_id uuid [ref: > users.id]
  graded_by uuid [ref: > users.id]
  status enum
  score integer
  feedback text
  submitted_at timestamp
  graded_at timestamp
  created_at timestamp
  updated_at timestamp
}

Table submission_links {
  id uuid [pk]
  submission_id uuid [ref: > submissions.id]
  url string
  type enum
  created_at timestamp
  updated_at timestamp
}