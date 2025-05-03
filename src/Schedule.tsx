import { Schedule as ScheduleType, Task } from "./types";
import { useGlobalStateDispatch, useGlobalStateStore } from "./contexts/globalStateContext";
import { HolidayList } from "./HolidayList";
import { SectionList } from "./SectionList";
import { TaskList } from "./TaskList";
import { ManuBar } from "./MenuBar";

export const Schedule = () => {
  const { schedule } = useGlobalStateStore();
  return (
    <div>
      <ManuBar />
      <p>バージョン: {schedule.version}</p>
      <p>タスク数: {schedule.tasks.length}</p>
      <HolidayList />
      <SectionList />
      <TaskList />
    </div>
  );
};
