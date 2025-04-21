import makeStore from "./makeStore";
import { State } from "../states/states";
import { Schedule, Section, Task } from "../types";

type Action =
  | {
      type: "SET_EDITABLE";
      payload: boolean;
    }
  | {
      type: "SET_SCHEDULE";
      payload: Schedule;
    }
  | {
      type: "ADD_SECTION";
      payload: Section;
    }
  | {
      type: "UPDATE_SECTION";
      payload: Section;
    }
  | {
      type: "REMOVE_SECTION";
      payload: string;
    }
  | {
      type: "ADD_TASK";
      payload: Task;
    }
  | {
      type: "UPDATE_TASK";
      payload: Task;
    }
  | {
      type: "REMOVE_TASK";
      payload: string;
    }
  | {
      type: "REORDER_TASK";
      payload: {
        taskId: string;
        newIndex: number;
      };
  };

const initialState: State = {
  editable: false,
  schedule: {
    version: "1.0",
    sections: [
      { sectionId: "a", sectionName: "セクション1" },
      { sectionId: "b", sectionName: "セクション2" },
      { sectionId: "c", sectionName: "セクション3" },
    ],
    tasks: [
      {
        sectionId: "a",
        taskId: "1",
        taskName: "タスク1",
        status: "active",
        scheduledStartDate: new Date("2025-01-01"),
        scheduledEndDate: new Date("2025-01-31"),
        personDays: 31,
        actualStartDate: new Date("2025-01-02"),
        assignee: "山田太郎",
        progress: 50,
      },
      {
        sectionId: "b",
        taskId: "2",
        taskName: "タスク2",
        status: "done",
        scheduledStartDate: new Date("2025-02-01"),
        scheduledEndDate: new Date("2025-02-28"),
        personDays: 28,
        actualStartDate: new Date("2025-02-01"),
        actualEndDate: new Date("2025-02-28"),
        assignee: "佐藤花子",
        progress: 100,
      },
      {
        sectionId: "c",
        taskId: "3",
        taskName: "タスク3",
        status: "new",
        scheduledStartDate: new Date("2025-03-01"),
        scheduledEndDate: new Date("2025-03-31"),
        personDays: 31,
        assignee: "鈴木一郎",
        progress: 0,
      },
    ],
  },
};

const mergeWithOverwrite = <T>(
  items: T[],
  keySelector: (item: T) => string | number,
): T[] => {
  return Array.from(
    new Map(items.map((item) => [keySelector(item), item])).values(),
  );
};

const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case "SET_EDITABLE": {
      return {
        ...state,
        editable: action.payload,
      };
    }
    case "SET_SCHEDULE": {
      return {
        ...state,
        ...action.payload,
      };
    }
    case "ADD_SECTION": {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          sections: [...state.schedule.sections, action.payload],
        },
      };
    }
    case "UPDATE_SECTION": {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          sections: mergeWithOverwrite(
            state.schedule.sections.map((section) =>
              section.sectionId === action.payload.sectionId
                ? { ...section, ...action.payload }
                : section,
            ),
            (section) => section.sectionId,
          ),
        },
      };
    }
    case "REMOVE_SECTION": {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          sections: state.schedule.sections.filter(
            (section) => section.sectionId !== action.payload,
          ),
        },
      };
    }
    case "ADD_TASK": {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          tasks: [...state.schedule.tasks, action.payload],
        },
      };
    }
    case "UPDATE_TASK": {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          tasks: mergeWithOverwrite(
            state.schedule.tasks.map((task) =>
              task.taskId === action.payload.taskId
                ? { ...task, ...action.payload }
                : task,
            ),
            (task) => task.taskId,
          ),
        },
      };
    }
    case "REMOVE_TASK": {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          tasks: state.schedule.tasks.filter(
            (task) => task.taskId !== action.payload,
          ),
        },
      };
    }
    case "REORDER_TASK": {
      const { taskId, newIndex } = action.payload;
      const taskToMove = state.schedule.tasks.find(
        (task) => task.taskId === taskId,
      );
      if (!taskToMove) return state;

      const filteredTasks = state.schedule.tasks.filter(
        (task) => task.taskId !== taskId,
      );

      const reorderedTasks = [
        ...filteredTasks.slice(0, newIndex),
        taskToMove,
        ...filteredTasks.slice(newIndex),
      ];

      return {
        ...state,
        schedule: {
          ...state.schedule,
          tasks: reorderedTasks,
        },
      };
    }
    default:
      return state;
  }
};

const [GlobalStateProvider, useGlobalStateStore, useGlobalStateDispatch] =
  makeStore(reducer, initialState);

export { GlobalStateProvider, useGlobalStateStore, useGlobalStateDispatch };
