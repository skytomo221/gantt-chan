export type Section = {
  sectionId: string;
  sectionName: string;
};

export type TaskStatus = "new" | "active" | "done" | "milestone";

export type Task = {
  sectionId: string;
  taskName: string;
  status: TaskStatus;
  assignee: string;
} & ((CommonTask & (NewTask | ActiveTask | DoneTask)) | Milestone);

export type CommonTask = {
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  personDays: number;
  progress: number;
};

export type NewTask = {
  status: "new";
  progress: 0;
};

export type ActiveTask = {
  status: "active";
  actualStartDate: Date;
};

export type DoneTask = {
  status: "done";
  actualStartDate: Date;
  actualEndDate: Date;
  progress: 100;
};

export type Milestone = {
  status: "milestone";
  scheduledDate: Date;
  actualDate?: Date;
};

export type Schedule = {
  version: "1.0";
  sections: Section[];
  tasks: Task[];
};
