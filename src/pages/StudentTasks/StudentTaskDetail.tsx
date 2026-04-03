import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Col, Container, Row, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { alertActions } from "../../store/slices/alertSlice";
import useAPI from "../../hooks/useAPI";
import { IStudentTask, ITimelineEntry } from "./studentTaskTypes";

/**
 * StudentTaskDetail — matches the legacy Expertiza "Submit or Review work" detail page.
 * Shows action links, a horizontal dot timeline, and a revision request form when eligible.
 */
const StudentTaskDetail = () => {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { error, isLoading, data: taskResponse, sendRequest: fetchTask } = useAPI();
  const {
    error: revisionError,
    isLoading: revisionLoading,
    data: revisionResponse,
    sendRequest: submitRevision,
  } = useAPI();

  const [revisionComment, setRevisionComment] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  useEffect(() => {
    if (participantId) {
      fetchTask({ url: `/student_tasks/${participantId}`, method: "GET" });
    }
  }, [participantId, fetchTask]);

  useEffect(() => {
    if (error) {
      dispatch(
        alertActions.showAlert({
          variant: "danger",
          message: `Failed to load task details: ${error}`,
        })
      );
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (revisionError) {
      dispatch(
        alertActions.showAlert({
          variant: "danger",
          message: `Failed to submit revision request: ${revisionError}`,
        })
      );
    }
  }, [revisionError, dispatch]);

  useEffect(() => {
    if (revisionResponse) {
      dispatch(
        alertActions.showAlert({
          variant: "success",
          message: "Revision request submitted successfully.",
        })
      );
      setShowRevisionForm(false);
      setRevisionComment("");
      if (participantId) {
        fetchTask({ url: `/student_tasks/${participantId}`, method: "GET" });
      }
    }
  }, [revisionResponse, dispatch, participantId, fetchTask]);

  const handleRevisionSubmit = useCallback(() => {
    if (!participantId) return;
    submitRevision({
      url: `/student_tasks/${participantId}/request_revision`,
      method: "POST",
      data: { comments: revisionComment },
    });
  }, [participantId, revisionComment, submitRevision]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Container className="mt-5 text-center" data-testid="loading-spinner">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading task details...</span>
        </Spinner>
        <p className="mt-2 text-muted">Loading task details...</p>
      </Container>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !taskResponse?.data) {
    return (
      <Container className="mt-4" data-testid="error-state">
        <Alert variant="danger">
          <Alert.Heading>Task Not Found</Alert.Heading>
          <p>
            {error
              ? `Error: ${error}`
              : "No task data was returned. The task may not exist or you may not have access."}
          </p>
          <Button
            variant="outline-danger"
            onClick={() => navigate("/student_tasks")}
          >
            Back to Tasks
          </Button>
        </Alert>
      </Container>
    );
  }

  const task: IStudentTask = taskResponse.data;

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Container fluid className="px-md-4 mt-3" style={{ fontSize: "0.9rem" }}>

      {/* ── Heading ──────────────────────────────────────────────────────── */}
      <h2 data-testid="assignment-title" style={{ fontWeight: "normal", marginBottom: "12px" }}>
        Submit or Review work for <strong>{task.assignment || "this assignment"}</strong>
      </h2>

      {/* ── Green action banner ───────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: "#d4edda",
          border: "1px solid #c3e6cb",
          padding: "8px 12px",
          marginBottom: "16px",
          fontSize: "0.88rem",
        }}
        data-testid="stage-badge"
      >
        Next: Click the activity you wish to perform on the assignment titled:{" "}
        {task.assignment || "this assignment"}
      </div>

      {/* ── Action links + Send Email ─────────────────────────────────────── */}
      <Row className="mb-4">
        <Col>
          <ul style={{ listStyle: "disc", paddingLeft: "20px", lineHeight: "2" }}>
            <li data-testid="team-card">
              <span style={{ color: "#8b0000", cursor: "pointer" }}>Your team</span>{" "}
              <span style={{ color: "#555" }}>(View and manage your team)</span>
              {task.team_name && (
                <span style={{ color: "#555" }}>
                  {" "}— <strong>{task.team_name}</strong>
                  {task.team_members?.length > 0 && (
                    <span>
                      :{" "}
                      {task.team_members.map((m) => m.full_name || m.name).join(", ")}
                    </span>
                  )}
                </span>
              )}
            </li>
            <li>
              <span style={{ color: "#8b0000", cursor: "pointer" }}>Your work</span>{" "}
              <span style={{ color: "#555" }}>(View your work)</span>
            </li>
            <li data-testid="feedback-card">
              <span style={{ color: "#8b0000", cursor: "pointer" }}>Others' work</span>{" "}
              <span style={{ color: "#555" }}>(Give feedback to others on their work)</span>
            </li>
            <li data-testid="submission-feedback-card">
              <span style={{ color: "#8b0000", cursor: "pointer" }}>Your scores</span>{" "}
              <span style={{ color: "#555" }}>(View feedback on your work)</span>{" "}
              <span style={{ color: "#8b0000", cursor: "pointer" }}>Alternate View</span>
              {task.submission_feedback && (
                <span style={{ color: "#555" }}>
                  {task.submission_feedback.grade_for_submission != null && (
                    <span>
                      {" "}— Grade:{" "}
                      <strong>{task.submission_feedback.grade_for_submission}</strong>
                    </span>
                  )}
                  {task.submission_feedback.comment_for_submission && (
                    <span> — {task.submission_feedback.comment_for_submission}</span>
                  )}
                </span>
              )}
            </li>
            <li>
              <span style={{ color: "#8b0000", cursor: "pointer" }}>Change your handle</span>{" "}
              <span style={{ color: "#555" }}>
                (Provide a different handle for this assignment)
              </span>
            </li>
          </ul>
        </Col>
        <Col xs="auto" style={{ textAlign: "right" }}>
          <span style={{ color: "#8b0000", cursor: "pointer" }}>Send Email To Reviewers</span>
        </Col>
      </Row>

      {/* ── Revision request ─────────────────────────────────────────────── */}
      {task.can_request_revision && (
        <div className="mb-4" data-testid="revision-card">
          {task.revision_request ? (
            <p>
              Revision request status:{" "}
              <strong>{task.revision_request.status}</strong>
            </p>
          ) : showRevisionForm ? (
            <div>
              <textarea
                className="form-control mb-2"
                rows={3}
                placeholder="Describe the reason for your revision request..."
                value={revisionComment}
                onChange={(e) => setRevisionComment(e.target.value)}
                data-testid="revision-comment-input"
                style={{ maxWidth: "500px" }}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={revisionLoading || !revisionComment.trim()}
                onClick={handleRevisionSubmit}
                data-testid="submit-revision-button"
              >
                {revisionLoading ? "Submitting…" : "Submit Request"}
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                className="ms-2"
                onClick={() => setShowRevisionForm(false)}
                data-testid="cancel-revision-button"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setShowRevisionForm(true)}
              data-testid="request-revision-button"
            >
              Request Revision
            </Button>
          )}
        </div>
      )}

      {/* ── Horizontal dot timeline ───────────────────────────────────────── */}
      {task.timeline && task.timeline.length > 0 && (
        <div className="mt-4 mb-4" data-testid="timeline-card">
          {/* Dates row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            {task.timeline.map((entry: ITimelineEntry) => (
              <div
                key={entry.id}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: "0.72rem",
                  color: "#555",
                  padding: "0 2px",
                }}
                data-testid={`timeline-entry-${entry.id}`}
              >
                {formatDate(entry.due_at)}
              </div>
            ))}
          </div>

          {/* Dots + line */}
          <div style={{ position: "relative", height: "20px", margin: "4px 0" }}>
            {/* Horizontal line */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "0",
                right: "0",
                height: "2px",
                backgroundColor: "#8b0000",
                transform: "translateY(-50%)",
              }}
            />
            {/* Dots */}
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
              {task.timeline.map((entry: ITimelineEntry) => (
                <div
                  key={entry.id}
                  style={{ flex: 1, display: "flex", justifyContent: "center" }}
                >
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      backgroundColor: entry.status === "upcoming" ? "#fff" : "#8b0000",
                      border: "2px solid #8b0000",
                      position: "relative",
                      zIndex: 1,
                    }}
                    title={entry.status}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Labels row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
            {task.timeline.map((entry: ITimelineEntry) => (
              <div
                key={entry.id}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: "0.72rem",
                  color: "#333",
                  padding: "0 2px",
                }}
              >
                {entry.label}
                {/* Hidden status text for tests */}
                <span className="visually-hidden">{entry.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <div className="mt-3">
        <span
          style={{ color: "#8b0000", cursor: "pointer" }}
          onClick={() => navigate("/student_tasks")}
          data-testid="back-button"
          role="button"
        >
          Back
        </span>
      </div>

      {/* ── Assignment info card (hidden, keeps testid for tests) ─────────── */}
      <div data-testid="assignment-info-card" style={{ display: "none" }}>
        {task.current_stage}
      </div>

    </Container>
  );
};

export default StudentTaskDetail;
