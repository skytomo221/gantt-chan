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
    }
  | {
      type: "ADD_HOLIDAY";
      payload: Date;
    }
  | {
      type: "REMOVE_HOLIDAY";
      payload: Date;
    }
  | {
      type: "SET_SKIP_WEEKENDS";
      payload: boolean;
    };

const today = new Date();
const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 86400000);

const initialState: State = {
  editable: false,
  schedule: {
    version: "1.0",
    sections: [
      { sectionId: "prep", sectionName: "準備" },
      { sectionId: "foundation", sectionName: "基礎工事" },
      { sectionId: "structure", sectionName: "躯体工事" },
      { sectionId: "finishing", sectionName: "仕上げ工事" },
    ],
    tasks: [
      {
        sectionId: "prep",
        taskId: "t1",
        taskName: "土地調査",
        status: "active",
        scheduledStartDate: addDays(today, 0),
        scheduledEndDate: addDays(today, 2),
        personDays: 3,
        actualStartDate: addDays(today, 0),
        assignee: "担当者A",
        progress: 40,
      },
      {
        sectionId: "prep",
        taskId: "m-permit",
        taskName: "許可承認",
        status: "milestone",
        scheduledDate: addDays(today, 3),
        assignee: "",
      },
      {
        sectionId: "foundation",
        taskId: "t2",
        taskName: "掘削",
        status: "new",
        scheduledStartDate: addDays(today, 4),
        scheduledEndDate: addDays(today, 7),
        personDays: 4,
        assignee: "担当者B",
        progress: 0,
      },
      {
        sectionId: "foundation",
        taskId: "t3",
        taskName: "コンクリート打設",
        status: "new",
        scheduledStartDate: addDays(today, 8),
        scheduledEndDate: addDays(today, 10),
        personDays: 3,
        assignee: "担当者C",
        progress: 0,
      },
      {
        sectionId: "structure",
        taskId: "t4",
        taskName: "骨組み組立",
        status: "new",
        scheduledStartDate: addDays(today, 11),
        scheduledEndDate: addDays(today, 17),
        personDays: 7,
        assignee: "担当者D",
        progress: 0,
      },
      {
        sectionId: "structure",
        taskId: "m-roof",
        taskName: "屋根設置",
        status: "milestone",
        scheduledDate: addDays(today, 18),
        assignee: "",
      },
      {
        sectionId: "finishing",
        taskId: "t5",
        taskName: "内装仕上げ",
        status: "new",
        scheduledStartDate: addDays(today, 19),
        scheduledEndDate: addDays(today, 25),
        personDays: 7,
        assignee: "担当者E",
        progress: 0,
      },
      {
        sectionId: "finishing",
        taskId: "m-final",
        taskName: "最終検査",
        status: "milestone",
        scheduledDate: addDays(today, 26),
        assignee: "",
      },
    ],
    holidays: [],
    skipWeekends: true,
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
        schedule: action.payload,
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
    case "ADD_HOLIDAY": {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          holidays: [...state.schedule.holidays, action.payload],
        },
      };
    }
    case "REMOVE_HOLIDAY": {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          holidays: state.schedule.holidays.filter(
            (holiday) => holiday !== action.payload,
          ),
        },
      };
    }
    case "SET_SKIP_WEEKENDS": {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          skipWeekends: action.payload,
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
