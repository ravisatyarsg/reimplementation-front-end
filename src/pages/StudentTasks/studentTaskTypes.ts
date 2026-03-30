// Types matching the JSON shape returned by GET /api/v1/student_tasks
// and GET /api/v1/student_tasks/:id

export interface ITeamMember {
  id: number;
  name: string;
  full_name: string;
}

export interface ITimelineEntry {
  id: number;
  label: string;
  phase: "submission" | "review" | "feedback";
  due_at: string | null;
  status: "completed" | "current" | "upcoming";
}

export interface IFeedbackEntry {
  response_id: number;
  reviewer_name: string | null;
  comment: string | null;
  submitted_at: string | null;
}

export interface ISubmissionFeedback {
  grade_for_submission: number | null;
  comment_for_submission: string | null;
}

export interface ITopicDetails {
  id: number | null;
  identifier: string | null;
  name: string | null;
}

export interface IRevisionRequest {
  id: number;
  status: string;
  comments: string | null;
  created_at: string;
}

export interface IStudentTask {
  id: number;                        // participant id
  participant_id: number;
  assignment_id: number | null;
  assignment: string;
  course_id: number | null;
  course: string | null;
  team_id: number | null;
  team_name: string | null;
  team_members: ITeamMember[];
  topic: string | null;
  topic_details: ITopicDetails | null;
  current_stage: string;
  stage_deadline: string | null;
  permission_granted: boolean;
  deadlines: any[];
  timeline: ITimelineEntry[];
  feedback: IFeedbackEntry[];
  submission_feedback: ISubmissionFeedback | null;
  can_request_revision: boolean;
  revision_request: IRevisionRequest | null;
  assignment_details: {
    id: number | null;
    name: string;
    course_id: number | null;
    course_name: string | null;
  };
  team_details: {
    id: number | null;
    name: string | null;
    members: ITeamMember[];
  };
  review_grade: number | null;
}
