
export type Section = {
  sectionId: string;
  sectionName: string;
}

export type Task = {
  sectionId: string;
  taskName: string;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  personDays: number;
  actualStartDate?: Date;
  actualEndDate?: Date;
  assignee: string;
  progress: number;
}

export type Schedule = {
  version: "1.0";
  sections: Section[];
  tasks: Task[];
};
