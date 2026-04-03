import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import StudentTaskDetail from "../StudentTaskDetail";
import alertReducer from "../../../store/slices/alertSlice";
import authReducer from "../../../store/slices/authenticationSlice";

// ── Mock useAPI ────────────────────────────────────────────────────────────────
vi.mock("../../../hooks/useAPI");
import useAPI from "../../../hooks/useAPI";
const mockUseAPI = vi.mocked(useAPI);

// ── Mock navigate ──────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Store ──────────────────────────────────────────────────────────────────────
const buildStore = () =>
  configureStore({ reducer: { alert: alertReducer, authentication: authReducer } });

// Render the detail component at a route that provides :participantId
const renderDetail = (participantId = "10") =>
  render(
    <Provider store={buildStore()}>
      <MemoryRouter initialEntries={[`/student_tasks/${participantId}`]}>
        <Routes>
          <Route path="/student_tasks/:participantId" element={<StudentTaskDetail />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

// ── Sample detail data ─────────────────────────────────────────────────────────
const sampleDetail = {
  id: 10,
  participant_id: 10,
  assignment_id: 1,
  assignment: "OSS Project",
  course_id: 5,
  course: "CSC 591",
  team_id: 3,
  team_name: "Team Wolf",
  team_members: [
    { id: 1, name: "alice", full_name: "Alice Smith" },
    { id: 2, name: "bob", full_name: "Bob Jones" },
  ],
  topic: "E2602",
  topic_details: { id: 7, identifier: "E2602", name: "Reimplement Student Task View" },
  current_stage: "In progress",
  stage_deadline: "2025-04-18T03:02:00.000Z",
  permission_granted: true,
  deadlines: [],
  timeline: [
    {
      id: 1,
      label: "Submission deadline",
      phase: "submission",
      due_at: "2025-04-06T03:02:00.000Z",
      status: "completed",
    },
    {
      id: 2,
      label: "Round 1 peer review",
      phase: "review",
      due_at: "2025-04-18T03:02:00.000Z",
      status: "current",
    },
  ],
  feedback: [
    {
      response_id: 99,
      reviewer_name: "Reviewer A",
      comment: "Good work overall.",
      submitted_at: "2025-04-10T10:00:00.000Z",
    },
  ],
  submission_feedback: {
    grade_for_submission: 90,
    comment_for_submission: "Excellent submission!",
  },
  can_request_revision: true,
  revision_request: null,
  assignment_details: { id: 1, name: "OSS Project", course_id: 5, course_name: "CSC 591" },
  team_details: { id: 3, name: "Team Wolf", members: [] },
  review_grade: 85,
};

// ── Mock helpers ───────────────────────────────────────────────────────────────
const mockWithData = (task = sampleDetail, extra = {}) => {
  mockUseAPI.mockReturnValue({
    data: { data: task },
    error: null,
    isLoading: false,
    sendRequest: vi.fn(),
    setData: vi.fn(),
    reset: vi.fn(),
    errorStatus: null,
    ...extra,
  } as any);
};

const mockLoading = () => {
  mockUseAPI.mockReturnValue({
    data: undefined,
    error: null,
    isLoading: true,
    sendRequest: vi.fn(),
    setData: vi.fn(),
    reset: vi.fn(),
    errorStatus: null,
  } as any);
};

const mockError = (msg = "Not found") => {
  mockUseAPI.mockReturnValue({
    data: undefined,
    error: msg,
    isLoading: false,
    sendRequest: vi.fn(),
    setData: vi.fn(),
    reset: vi.fn(),
    errorStatus: "404",
  } as any);
};

// ─────────────────────────────────────────────────────────────────────────────

describe("StudentTaskDetail — detail view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading state ────────────────────────────────────────────────────────────

  it("shows a loading spinner while data is being fetched", () => {
    mockLoading();
    renderDetail();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.getByText(/loading task details/i)).toBeInTheDocument();
  });

  // ── Error state ──────────────────────────────────────────────────────────────

  it("shows an error state when the API returns an error", () => {
    mockError("Not found");
    renderDetail();
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByText(/task not found/i)).toBeInTheDocument();
  });

  it("dispatches a danger alert when the API errors", async () => {
    const store = buildStore();
    mockError("Server error");
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/student_tasks/10"]}>
          <Routes>
            <Route path="/student_tasks/:participantId" element={<StudentTaskDetail />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() => {
      const state = store.getState() as any;
      expect(state.alert.show).toBe(true);
      expect(state.alert.variant).toBe("danger");
    });
  });

  it("back button on error state navigates to /student_tasks", async () => {
    mockError();
    renderDetail();
    const backBtn = screen.getByRole("button", { name: /back to tasks/i }) || screen.getByTestId("back-button");
    await userEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/student_tasks");
  });

  // ── Rendering success state ──────────────────────────────────────────────────

  it("renders the assignment title", () => {
    mockWithData();
    renderDetail();
    expect(screen.getByTestId("assignment-title")).toHaveTextContent("OSS Project");
  });

  it("renders the course name", () => {
    mockWithData();
    renderDetail();
    expect(screen.getByText(/CSC 591/)).toBeInTheDocument();
  });

  it("renders the current stage badge", () => {
    mockWithData();
    renderDetail();
    expect(screen.getByTestId("stage-badge")).toBeInTheDocument();
  });

  it("renders the topic name", () => {
    mockWithData();
    renderDetail();
    expect(screen.getAllByText(/E2602/i).length).toBeGreaterThan(0);
  });

  it("renders the team name and members", () => {
    mockWithData();
    renderDetail();
    expect(screen.getByTestId("team-card")).toBeInTheDocument();
    expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
    expect(screen.getByText(/Bob Jones/i)).toBeInTheDocument();
  });

  // ── Timeline ─────────────────────────────────────────────────────────────────

  it("renders the timeline card with entries", () => {
    mockWithData();
    renderDetail();
    expect(screen.getByTestId("timeline-card")).toBeInTheDocument();
    expect(screen.getByText("Submission deadline")).toBeInTheDocument();
    expect(screen.getByText("Round 1 peer review")).toBeInTheDocument();
  });

  it("renders timeline status badges", () => {
    mockWithData();
    renderDetail();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("current")).toBeInTheDocument();
  });

  // ── Feedback ─────────────────────────────────────────────────────────────────

  it("renders reviewer feedback", () => {
    mockWithData();
    renderDetail();
    expect(screen.getByTestId("feedback-card")).toBeInTheDocument();
    expect(screen.getAllByText(/Good work overall/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Reviewer A/)).toBeInTheDocument();
  });

  // ── Submission feedback ──────────────────────────────────────────────────────

  it("renders submission feedback when present", () => {
    mockWithData();
    renderDetail();
    expect(screen.getByTestId("submission-feedback-card")).toBeInTheDocument();
    expect(screen.getAllByText(/Excellent submission/i).length).toBeGreaterThan(0);
  });

  it("does not render submission feedback card when absent", () => {
    mockWithData({ ...sampleDetail, submission_feedback: null });
    renderDetail();
    expect(screen.queryByText(/Excellent submission/i)).not.toBeInTheDocument();
  });

  // ── Revision request ─────────────────────────────────────────────────────────

  it("renders the revision card when can_request_revision is true", () => {
    mockWithData();
    renderDetail();
    expect(screen.getByTestId("revision-card")).toBeInTheDocument();
    expect(screen.getByTestId("request-revision-button")).toBeInTheDocument();
  });

  it("does not render the revision card when can_request_revision is false", () => {
    mockWithData({ ...sampleDetail, can_request_revision: false });
    renderDetail();
    expect(screen.queryByTestId("revision-card")).not.toBeInTheDocument();
  });

  it("shows the revision form when 'Request Revision' is clicked", async () => {
    mockWithData();
    renderDetail();
    await userEvent.click(screen.getByTestId("request-revision-button"));
    expect(screen.getByTestId("revision-comment-input")).toBeInTheDocument();
    expect(screen.getByTestId("submit-revision-button")).toBeInTheDocument();
    expect(screen.getByTestId("cancel-revision-button")).toBeInTheDocument();
  });

  it("hides the revision form when Cancel is clicked", async () => {
    mockWithData();
    renderDetail();
    await userEvent.click(screen.getByTestId("request-revision-button"));
    await userEvent.click(screen.getByTestId("cancel-revision-button"));
    expect(screen.queryByTestId("revision-comment-input")).not.toBeInTheDocument();
    expect(screen.getByTestId("request-revision-button")).toBeInTheDocument();
  });

  it("submit button is disabled when comment is empty", async () => {
    mockWithData();
    renderDetail();
    await userEvent.click(screen.getByTestId("request-revision-button"));
    expect(screen.getByTestId("submit-revision-button")).toBeDisabled();
  });

  it("submit button is enabled once comment is typed", async () => {
    mockWithData();
    renderDetail();
    await userEvent.click(screen.getByTestId("request-revision-button"));
    await userEvent.type(
      screen.getByTestId("revision-comment-input"),
      "Please allow resubmission."
    );
    expect(screen.getByTestId("submit-revision-button")).not.toBeDisabled();
  });

  it("shows existing revision request status when one exists", () => {
    mockWithData({
      ...sampleDetail,
      revision_request: { id: 1, status: "PENDING", comments: "Need more time", created_at: "" },
    });
    renderDetail();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  // ── Navigation ───────────────────────────────────────────────────────────────

  it("back button navigates to /student_tasks", async () => {
    mockWithData();
    renderDetail();
    await userEvent.click(screen.getByTestId("back-button"));
    expect(mockNavigate).toHaveBeenCalledWith("/student_tasks");
  });

  // ── API call ─────────────────────────────────────────────────────────────────

  it("calls the API with the correct participant ID from the route", () => {
    const mockSendRequest = vi.fn();
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      sendRequest: mockSendRequest,
      setData: vi.fn(),
      reset: vi.fn(),
      errorStatus: null,
    } as any);
    renderDetail("42");
    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/student_tasks/42", method: "GET" })
    );
  });
});
