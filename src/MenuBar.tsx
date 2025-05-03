import { Schedule as ScheduleType, Task } from "./types";
import { useGlobalStateDispatch, useGlobalStateStore } from "./contexts/globalStateContext";

export const ManuBar = () => {
  const { schedule, editable } = useGlobalStateStore();
  const dispatch = useGlobalStateDispatch();

  const setEditable = (editable: boolean) => {
    dispatch({
      type: "SET_EDITABLE",
      payload: editable,
    });
  }

  const setSchedule = (newSchedule: ScheduleType) => {
    dispatch({
      type: "SET_SCHEDULE",
      payload: newSchedule,
    });
  }

  const load = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          const raw = JSON.parse(text);
          const parsedSchedule: ScheduleType = {
            ...raw,
            holidays: raw.holidays.map((holiday: any) => new Date(holiday)),
            tasks: raw.tasks.map((task: any) => ({
              ...task,
              scheduledStartDate: new Date(task.scheduledStartDate),
              scheduledEndDate: new Date(task.scheduledEndDate),
              actualStartDate: task.actualStartDate ? new Date(task.actualStartDate) : undefined,
              actualEndDate: task.actualEndDate ? new Date(task.actualEndDate) : undefined,
            } as Task)),
          };
          if (parsedSchedule.version === "1.0") {
            setSchedule(parsedSchedule);
          } else {
            alert("Unsupported schedule version.");
          }
        } catch (error) {
          alert("Failed to parse the file. Please ensure it is a valid JSON.");
        }
      }
    };
    fileInput.click();
  }

  const save = () => {
    const fileName = `schedule_${new Date().toISOString().split("T")[0]}.json`;
    const blob = new Blob([JSON.stringify(schedule, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <menu>
        <button onClick={() => setEditable(!editable)}>{editable ? "編集を無効にする" : "編集を有効にする"}</button>
        <button onClick={load}>読み込む</button>
        <button onClick={save}>保存する</button>
      </menu>
    </section>
  );
};
