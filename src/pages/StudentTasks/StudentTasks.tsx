import { useCallback, useEffect, useMemo } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { Outlet, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { alertActions } from "../../store/slices/alertSlice";
import useAPI from "../../hooks/useAPI";
import { IStudentTask } from "./studentTaskTypes";

/**
 * StudentTasks — lists all assignment tasks for the currently logged-in student.
 * Matches the layout of the legacy Expertiza student task list page.
 */
const StudentTasks = () => {
  const { error, isLoading, data: tasksResponse, sendRequest: fetchTasks } = useAPI();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    fetchTasks({ url: "/student_tasks", method: "GET" });
  }, [fetchTasks]);

  useEffect(() => {
    if (error) {
      dispatch(
        alertActions.showAlert({
          variant: "danger",
          message: `Failed to load student tasks: ${error}`,
        })
      );
    }
  }, [error, dispatch]);

  const handleViewDetail = useCallback(
    (task: IStudentTask) => {
      navigate(`/student_tasks/${task.participant_id}`);
    },
    [navigate]
  );

  const tableData: IStudentTask[] = useMemo(
    () =>
      isLoading || !tasksResponse?.data
        ? []
        : Array.isArray(tasksResponse.data)
        ? tasksResponse.data
        : [],
    [tasksResponse?.data, isLoading]
  );

  // Sidebar: tasks not yet started
  const tasksNotStarted = useMemo(
    () =>
      tableData.filter(
        (t) =>
          !t.current_stage ||
          t.current_stage.toLowerCase() === "unknown" ||
          t.current_stage.toLowerCase().includes("not")
      ).length,
    [tableData]
  );

  // Sidebar: tasks with revisions
  const revisions = useMemo(
    () => tableData.filter((t) => t.can_request_revision || t.revision_request),
    [tableData]
  );

  // Sidebar: teammates grouped by course
  const teammatesByCourse = useMemo(() => {
    const groups: Record<string, { courseName: string; members: { id: number; name: string }[] }> =
      {};
    tableData.forEach((task) => {
      const key = task.course || "Unknown Course";
      if (!groups[key]) {
        groups[key] = { courseName: key, members: [] };
      }
      task.team_members?.forEach((member) => {
        if (!groups[key].members.find((m) => m.id === member.id)) {
          groups[key].members.push({
            id: member.id,
            name: member.full_name || member.name,
          });
        }
      });
    });
    return Object.values(groups).filter((g) => g.members.length > 0);
  }, [tableData]);

  const formatDeadline = (iso: string | null) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <>
      <Outlet />
      <main>
        <Container fluid className="px-md-4 mt-3">
          <Row>
            {/* ── Left Sidebar ─────────────────────────────────────────── */}
            <Col
              md={3}
              style={{ borderRight: "1px solid #ddd", fontSize: "0.85rem", paddingRight: "12px" }}
            >
              {/* Tasks not yet started */}
              <div className="mb-3">
                <span
                  className="badge me-1"
                  style={{ backgroundColor: "#8b0000", color: "white" }}
                >
                  {tasksNotStarted}
                </span>
                Tasks not yet started
              </div>

              {/* Revisions */}
              <div className="mb-3">
                <span
                  className="badge me-1"
                  style={{ backgroundColor: "#8b0000", color: "white" }}
                >
                  {revisions.length}
                </span>
                Revisions
                {revisions.map((t) => (
                  <div key={t.participant_id} style={{ paddingLeft: "12px" }}>
                    <span
                      style={{ color: "#8b0000", cursor: "pointer" }}
                      onClick={() => handleViewDetail(t)}
                    >
                      &#187;{" "}
                      <span style={{ textDecoration: "underline" }}>{t.assignment} review</span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Teammates by course */}
              {teammatesByCourse.length > 0 && (
                <>
                  <div className="mb-2">
                    <strong>Students who have teamed with you</strong>
                  </div>
                  {teammatesByCourse.map((group, i) => (
                    <div key={i} className="mb-3">
                      <span
                        className="badge me-1"
                        style={{ backgroundColor: "#8b0000", color: "white" }}
                      >
                        {group.members.length}
                      </span>
                      <strong>{group.courseName}</strong>
                      {group.members.map((m) => (
                        <div key={m.id} style={{ paddingLeft: "12px", color: "#333" }}>
                          &#187; {m.name}
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </Col>

            {/* ── Main Content ─────────────────────────────────────────── */}
            <Col md={9}>
              <h2 className="mb-3" role="heading">
                Assignments
              </h2>

              {/* Empty state */}
              {!isLoading && tableData.length === 0 && !error && (
                <p className="text-muted" data-testid="empty-state">
                  You have no tasks assigned at the moment.
                </p>
              )}

              {/* Task table */}
              {tableData.length > 0 && (
                <table
                  className="table table-bordered table-sm"
                  style={{ fontSize: "0.88rem" }}
                >
                  <thead style={{ backgroundColor: "#f8f8f8" }}>
                    <tr>
                      <th>Assignment</th>
                      <th>Course</th>
                      <th>Topic</th>
                      <th>Current Stage</th>
                      <th>Review Grade</th>
                      <th>Badges</th>
                      <th>Stage Deadline &#9432;</th>
                      <th>Publishing Rights &#9432;</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((task) => (
                      <tr key={task.participant_id}>
                        {/* Assignment name — clickable link */}
                        <td>
                          <span
                            role="button"
                            style={{ color: "#8b0000", cursor: "pointer", fontWeight: 500 }}
                            onClick={() => handleViewDetail(task)}
                            aria-label={task.assignment || "Assignment"}
                          >
                            {task.assignment || "—"}
                          </span>
                        </td>
                        <td>{task.course || "—"}</td>
                        <td>{task.topic || "-"}</td>
                        <td>{task.current_stage || "—"}</td>
                        <td>{task.review_grade != null ? task.review_grade : "N/A"}</td>
                        <td>
                          {task.review_grade != null && (
                            <span
                              style={{ color: "#0d6efd", fontSize: "1rem" }}
                              title="View review grade details"
                            >
                              &#9432;
                            </span>
                          )}
                        </td>
                        <td>{formatDeadline(task.stage_deadline)}</td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={!!task.permission_granted}
                            readOnly
                            aria-label="Publishing rights"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Col>
          </Row>
        </Container>
      </main>
    </>
  );
};

export default StudentTasks;
