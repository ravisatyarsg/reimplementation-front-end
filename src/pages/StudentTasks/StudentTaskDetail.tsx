import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  ListGroup,
  Row,
  Spinner,
  Alert,
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { alertActions } from "../../store/slices/alertSlice";
import useAPI from "../../hooks/useAPI";
import { IStudentTask, ITimelineEntry } from "./studentTaskTypes";
import { stageVariant } from "./StudentTaskColumns";

/**
 * StudentTaskDetail — shows the full detail view for a single student task.
 *
 * Calls GET /api/v1/student_tasks/:id where :id is the AssignmentParticipant id.
 * Shows assignment info, team, topic, stage timeline, feedback, and a
 * "Request Revision" button when the backend indicates it is available.
 */
const StudentTaskDetail = () => {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    error,
    isLoading,
    data: taskResponse,
    sendRequest: fetchTask,
  } = useAPI();

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
      // Refresh task data to reflect new revision request status
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

  // ── Loading state ──────────────────────────────────────────────────────────
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

  // ── Error / not found state ────────────────────────────────────────────────
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
          <Button variant="outline-danger" onClick={() => navigate("/student_tasks")}>
            Back to Tasks
          </Button>
        </Alert>
      </Container>
    );
  }

  const task: IStudentTask = taskResponse.data;

  // ── Timeline helpers ───────────────────────────────────────────────────────
  const timelinePhaseIcon = (phase: ITimelineEntry["phase"]) => {
    if (phase === "submission") return "📄";
    if (phase === "review") return "🔍";
    return "💬";
  };

  const timelineStatusVariant = (
    status: ITimelineEntry["status"]
  ): "success" | "warning" | "secondary" => {
    if (status === "completed") return "success";
    if (status === "current") return "warning";
    return "secondary";
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "No deadline";
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Container fluid className="px-md-4 mt-3">
      {/* Header */}
      <Row className="mb-3 align-items-center">
        <Col>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => navigate("/student_tasks")}
            data-testid="back-button"
          >
            ← Back to Tasks
          </Button>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <h2 data-testid="assignment-title">
            {task.assignment || "Assignment Details"}
          </h2>
          {task.course && (
            <p className="text-muted mb-0">
              Course: <strong>{task.course}</strong>
            </p>
          )}
        </Col>
        <Col xs="auto">
          <Badge bg={stageVariant(task.current_stage)} className="fs-6" data-testid="stage-badge">
            {task.current_stage}
          </Badge>
        </Col>
      </Row>

      <Row className="g-4">
        {/* Left column — assignment / team / topic info */}
        <Col md={5}>
          <Card className="mb-3" data-testid="assignment-info-card">
            <Card.Header>
              <strong>Assignment Info</strong>
            </Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item>
                <span className="text-muted">Stage Deadline:</span>{" "}
                <strong>{formatDate(task.stage_deadline)}</strong>
              </ListGroup.Item>
              {task.topic && (
                <ListGroup.Item>
                  <span className="text-muted">Topic:</span>{" "}
                  <strong>{task.topic}</strong>
                </ListGroup.Item>
              )}
              {task.review_grade != null && (
                <ListGroup.Item>
                  <span className="text-muted">Review Grade:</span>{" "}
                  <strong>{task.review_grade}</strong>
                </ListGroup.Item>
              )}
            </ListGroup>
          </Card>

          {/* Team card */}
          {task.team_name && (
            <Card className="mb-3" data-testid="team-card">
              <Card.Header>
                <strong>Team: {task.team_name}</strong>
              </Card.Header>
              {task.team_members && task.team_members.length > 0 ? (
                <ListGroup variant="flush">
                  {task.team_members.map((member) => (
                    <ListGroup.Item key={member.id}>
                      {member.full_name || member.name}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <Card.Body className="text-muted">No team members listed.</Card.Body>
              )}
            </Card>
          )}

          {/* Submission feedback */}
          {task.submission_feedback && (
            <Card className="mb-3" data-testid="submission-feedback-card">
              <Card.Header>
                <strong>Submission Feedback</strong>
              </Card.Header>
              <Card.Body>
                {task.submission_feedback.grade_for_submission != null && (
                  <p>
                    <span className="text-muted">Grade:</span>{" "}
                    <strong>{task.submission_feedback.grade_for_submission}</strong>
                  </p>
                )}
                {task.submission_feedback.comment_for_submission && (
                  <p className="mb-0">{task.submission_feedback.comment_for_submission}</p>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Right column — timeline + feedback */}
        <Col md={7}>
          {/* Timeline */}
          {task.timeline && task.timeline.length > 0 && (
            <Card className="mb-3" data-testid="timeline-card">
              <Card.Header>
                <strong>Stage Timeline</strong>
              </Card.Header>
              <ListGroup variant="flush">
                {task.timeline.map((entry) => (
                  <ListGroup.Item
                    key={entry.id}
                    className="d-flex justify-content-between align-items-center"
                    data-testid={`timeline-entry-${entry.id}`}
                  >
                    <span>
                      {timelinePhaseIcon(entry.phase)}{" "}
                      <strong>{entry.label}</strong>
                    </span>
                    <span className="d-flex align-items-center gap-2">
                      <small className="text-muted">{formatDate(entry.due_at)}</small>
                      <Badge bg={timelineStatusVariant(entry.status)}>
                        {entry.status}
                      </Badge>
                    </span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card>
          )}

          {/* Reviewer feedback */}
          {task.feedback && task.feedback.length > 0 && (
            <Card className="mb-3" data-testid="feedback-card">
              <Card.Header>
                <strong>Reviewer Feedback</strong>
              </Card.Header>
              <ListGroup variant="flush">
                {task.feedback.map((fb) => (
                  <ListGroup.Item key={fb.response_id}>
                    <p className="mb-1">
                      <small className="text-muted">
                        {fb.reviewer_name || "Anonymous"} —{" "}
                        {formatDate(fb.submitted_at)}
                      </small>
                    </p>
                    <p className="mb-0">{fb.comment || "No comment provided."}</p>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card>
          )}

          {/* Revision request */}
          {task.can_request_revision && (
            <Card className="mb-3" data-testid="revision-card">
              <Card.Header>
                <strong>Request Revision</strong>
              </Card.Header>
              <Card.Body>
                {task.revision_request ? (
                  <p className="mb-0">
                    Revision request status:{" "}
                    <Badge bg="info">{task.revision_request.status}</Badge>
                  </p>
                ) : showRevisionForm ? (
                  <>
                    <textarea
                      className="form-control mb-2"
                      rows={3}
                      placeholder="Describe the reason for your revision request..."
                      value={revisionComment}
                      onChange={(e) => setRevisionComment(e.target.value)}
                      data-testid="revision-comment-input"
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
                  </>
                ) : (
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => setShowRevisionForm(true)}
                    data-testid="request-revision-button"
                  >
                    Request Revision
                  </Button>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default StudentTaskDetail;
