import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "react-bootstrap";
import { IStudentTask } from "./studentTaskTypes";

const columnHelper = createColumnHelper<IStudentTask>();

/**
 * Format an ISO8601 deadline string into a readable date/time.
 */
const formatDeadline = (iso: string | null): string => {
  if (!iso) return "N/A";
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/**
 * Map current_stage to a human-friendly label and a Bootstrap badge variant.
 */
export const stageVariant = (stage: string): "success" | "warning" | "primary" | "secondary" => {
  const s = stage.toLowerCase();
  if (s.includes("finish") || s.includes("done") || s.includes("feedback")) return "success";
  if (s.includes("review")) return "warning";
  if (s.includes("progress") || s.includes("submit") || s.includes("start")) return "primary";
  return "secondary";
};

export const studentTaskColumns = (
  onViewDetail: (task: IStudentTask) => void
) => [
  columnHelper.accessor("assignment", {
    header: "Assignment",
    cell: (info) => (
      <Button
        variant="link"
        className="p-0 text-start"
        onClick={() => onViewDetail(info.row.original)}
      >
        {info.getValue() || "—"}
      </Button>
    ),
  }),
  columnHelper.accessor("course", {
    header: "Course",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("topic", {
    header: "Topic",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("current_stage", {
    header: "Current Stage",
    cell: (info) => {
      const stage = info.getValue() || "Unknown";
      const variant = stageVariant(stage);
      return (
        <span className={`badge bg-${variant}`}>{stage}</span>
      );
    },
  }),
  columnHelper.accessor("stage_deadline", {
    header: "Stage Deadline",
    cell: (info) => formatDeadline(info.getValue()),
  }),
  columnHelper.accessor("review_grade", {
    header: "Review Grade",
    cell: (info) => {
      const grade = info.getValue();
      return grade != null ? `${grade}` : "N/A";
    },
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: (info) => (
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => onViewDetail(info.row.original)}
      >
        View Details
      </Button>
    ),
  }),
];
