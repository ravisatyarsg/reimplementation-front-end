import { useCallback, useEffect, useMemo } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { Outlet, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { alertActions } from "../../store/slices/alertSlice";
import useAPI from "../../hooks/useAPI";
import Table from "../../components/Table/Table";
import { studentTaskColumns } from "./StudentTaskColumns";
import { IStudentTask } from "./studentTaskTypes";

/**
 * StudentTasks — lists all assignment tasks for the currently logged-in student.
 *
 * Calls GET /api/v1/student_tasks which returns an array of StudentTask objects,
 * one per AssignmentParticipant record belonging to the current user.
 *
 * Clicking an assignment name or "View Details" navigates to the detail page
 * at /student_tasks/:participantId.
 */
const StudentTasks = () => {
  const { error, isLoading, data: tasksResponse, sendRequest: fetchTasks } = useAPI();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Fetch all tasks for the current user on mount
  useEffect(() => {
    fetchTasks({ url: "/student_tasks", method: "GET" });
  }, [fetchTasks]);

  // Dispatch an alert whenever the API call fails
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

  const columns = useMemo(
    () => studentTaskColumns(handleViewDetail),
    [handleViewDetail]
  );

  const tableData: IStudentTask[] = useMemo(
    () => (isLoading || !tasksResponse?.data ? [] : tasksResponse.data),
    [tasksResponse?.data, isLoading]
  );

  return (
    <>
      <Outlet />
      <main>
        <Container fluid className="px-md-4">
          <Row className="mt-md-2 mb-md-2">
            <Col className="text-center">
              <h1>Student Tasks</h1>
            </Col>
            <hr />
          </Row>

          {/* Empty state — shown only after loading completes with no results */}
          {!isLoading && tableData.length === 0 && !error && (
            <Row>
              <Col className="text-center text-muted mt-4" data-testid="empty-state">
                <p>You have no tasks assigned at the moment.</p>
              </Col>
            </Row>
          )}

          <Row>
            <Table
              data={tableData}
              columns={columns}
              showGlobalFilter={false}
              columnVisibility={{ participant_id: false }}
            />
          </Row>
        </Container>
      </main>
    </>
  );
};

export default StudentTasks;
