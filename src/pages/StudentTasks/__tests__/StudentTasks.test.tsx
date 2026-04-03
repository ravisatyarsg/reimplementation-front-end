import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import StudentTasks from "../StudentTasks";
import alertReducer from "../../../store/slices/alertSlice";
import authReducer from "../../../store/slices/authenticationSlice";

// ── Mock useAPI ────────────────────────────────────────────────────────────────
vi.mock("../../../hooks/useAPI");
import useAPI from "../../../hooks/useAPI";
const mockUseAPI = vi.mocked(useAPI);

// ── Mock react-router-dom navigate ────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Helpers ────────────────────────────────────────────────────────────────────
const buildStore = () =>
  configureStore({
    reducer: {
      alert: alertReducer,
      authentication: authReducer,
    },
  });

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <Provider store={buildStore()}>
      <BrowserRouter>{ui}</BrowserRouter>
    </Provider>
  );

// ── Sample task data matching the backend as_json shape ───────────────────────
const sampleTask = {
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
  timeline: [],
  feedback: [],
  submission_feedback: null,
  can_request_revision: false,
  revision_request: null,
  assignment_details: { id: 1, name: "OSS Project", course_id: 5, course_name: "CSC 591" },
  team_details: { id: 3, name: "Team Wolf", members: [] },
  review_grade: null,
};

const sampleTask2 = {
  ...sampleTask,
  id: 20,
  participant_id: 20,
  assignment: "Program 3",
  course: "CSC 517",
  current_stage: "review",
  review_grade: 85,
};

// ── Default mock that returns data ────────────────────────────────────────────
const mockWithData = (tasks = [sampleTask, sampleTask2]) => {
  mockUseAPI.mockReturnValue({
    data: { data: tasks },
    error: null,
    isLoading: false,
    sendRequest: vi.fn(),
    setData: vi.fn(),
    reset: vi.fn(),
    errorStatus: null,
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

const mockError = (msg = "Network error") => {
  mockUseAPI.mockReturnValue({
    data: undefined,
    error: msg,
    isLoading: false,
    sendRequest: vi.fn(),
    setData: vi.fn(),
    reset: vi.fn(),
    errorStatus: "500",
  } as any);
};

const mockEmpty = () => {
  mockUseAPI.mockReturnValue({
    data: { data: [] },
    error: null,
    isLoading: false,
    sendRequest: vi.fn(),
    setData: vi.fn(),
    reset: vi.fn(),
    errorStatus: null,
  } as any);
};

// ─────────────────────────────────────────────────────────────────────────────

describe("StudentTasks — list view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ───────────────────────────────────────────────────────────────

  it("renders the page heading", () => {
    mockWithData();
    renderWithProviders(<StudentTasks />);
    expect(screen.getByRole("heading", { name: /assignments/i })).toBeInTheDocument();
  });

  it("renders a row for each task returned by the API", () => {
    mockWithData();
    renderWithProviders(<StudentTasks />);
    expect(screen.getByText("OSS Project")).toBeInTheDocument();
    expect(screen.getByText("Program 3")).toBeInTheDocument();
  });

  it("renders course names in the table", () => {
    mockWithData();
    renderWithProviders(<StudentTasks />);
    expect(screen.getByText("CSC 591")).toBeInTheDocument();
    expect(screen.getByText("CSC 517")).toBeInTheDocument();
  });

  it("renders current stage badges", () => {
    mockWithData();
    renderWithProviders(<StudentTasks />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("review")).toBeInTheDocument();
  });

  it("renders review grade when present", () => {
    mockWithData();
    renderWithProviders(<StudentTasks />);
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("shows N/A for review grade when absent", () => {
    mockWithData([sampleTask]);
    renderWithProviders(<StudentTasks />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("renders assignment name links for each task", () => {
    mockWithData();
    renderWithProviders(<StudentTasks />);
    const links = screen.getAllByRole("button", { name: /oss project|program 3/i });
    expect(links).toHaveLength(2);
  });

  // ── Loading state ────────────────────────────────────────────────────────────

  it("renders an empty table while loading (no data yet)", () => {
    mockLoading();
    renderWithProviders(<StudentTasks />);
    // Table should be present but contain no task rows
    expect(screen.queryByText("OSS Project")).not.toBeInTheDocument();
  });

  // ── Empty state ──────────────────────────────────────────────────────────────

  it("shows the empty-state message when the API returns no tasks", () => {
    mockEmpty();
    renderWithProviders(<StudentTasks />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no tasks assigned/i)).toBeInTheDocument();
  });

  it("does NOT show empty-state while still loading", () => {
    mockLoading();
    renderWithProviders(<StudentTasks />);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  // ── Error state ──────────────────────────────────────────────────────────────

  it("dispatches an alert when the API returns an error", async () => {
    mockError("Network error");
    const store = buildStore();
    render(
      <Provider store={store}>
        <BrowserRouter>
          <StudentTasks />
        </BrowserRouter>
      </Provider>
    );
    await waitFor(() => {
      const state = store.getState() as any;
      expect(state.alert.show).toBe(true);
      expect(state.alert.variant).toBe("danger");
      expect(state.alert.message).toContain("Network error");
    });
  });

  // ── Navigation ───────────────────────────────────────────────────────────────

  it("navigates to the detail page when the assignment name is clicked", async () => {
    mockWithData([sampleTask]);
    renderWithProviders(<StudentTasks />);
    const button = screen.getByRole("button", { name: "OSS Project" });
    await userEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/student_tasks/10");
  });

  it("navigates to the detail page when the assignment name link is clicked", async () => {
    mockWithData([sampleTask]);
    renderWithProviders(<StudentTasks />);
    const link = screen.getByRole("button", { name: "OSS Project" });
    await userEvent.click(link);
    expect(mockNavigate).toHaveBeenCalledWith("/student_tasks/10");
  });

  // ── API call ─────────────────────────────────────────────────────────────────

  it("calls the API with GET /student_tasks on mount", () => {
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
    renderWithProviders(<StudentTasks />);
    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/student_tasks", method: "GET" })
    );
  });
});
