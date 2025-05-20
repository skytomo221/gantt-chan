import { Task } from "./types";
import { useGlobalStateDispatch, useGlobalStateStore } from "./contexts/globalStateContext";

export const TaskList = () => {
  const { schedule, editable } = useGlobalStateStore();
  const dispatch = useGlobalStateDispatch();

  const updateTask = (updatedTask: Task) => {
    dispatch({
      type: "UPDATE_TASK",
      payload: updatedTask,
    });
  }

  const addTask = (newTask: Task) => {
    dispatch({
      type: "ADD_TASK",
      payload: newTask,
    });
  }

  const removeTask = (taskId: string) => {
    dispatch({
      type: "REMOVE_TASK",
      payload: taskId,
    });
  }

  const reorderTask = (taskId: string, newIndex: number) => {
    dispatch({
      type: "REORDER_TASK",
      payload: {
        taskId,
        newIndex,
      },
    });
  }

  const calculateEndDate = (startDate: Date, personDays: number) => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() - 1);
    while (personDays > 0) {
      endDate.setDate(endDate.getDate() + 1);
      if (schedule.holidays.some(holiday => holiday.getTime() === endDate.getTime())) {
        continue;
      }
      if (schedule.skipWeekends && (endDate.getDay() === 0 || endDate.getDay() === 6)) {
        continue;
      }
      personDays--;
    }
    return endDate;
  }

  const calculatePersonDays = (startDate: Date, endDate: Date) => {
    let personDays = 0;
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (!schedule.holidays.some(holiday => holiday.getTime() === currentDate.getTime()) &&
        !(schedule.skipWeekends && (currentDate.getDay() === 0 || currentDate.getDay() === 6))) {
        personDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return personDays;
  }

  return (
    <section>
      <h3>タスク一覧</h3>
      <div>
        <button
          onClick={() => {
            const newTask: Task = {
              sectionId: schedule.sections[0].sectionId,
              taskId: Math.random().toString(36).substring(2, 15),
              taskName: "新しいタスク",
              status: "new",
              scheduledStartDate: new Date(new Date().setHours(0, 0, 0, 0)),
              scheduledEndDate: new Date(new Date().setHours(0, 0, 0, 0)),
              personDays: 0,
              assignee: "",
              progress: 0,
            };
            addTask(newTask);
          }}>
          タスクを追加する
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>セクション</th>
            <th>タスク</th>
            <th>ステータス</th>
            <th>予定開始日</th>
            <th>予定終了日</th>
            <th>人日</th>
            <th>実際の開始日</th>
            <th>実際の終了日</th>
            <th>担当者</th>
            <th>進捗率</th>
          </tr>
        </thead>
        <tbody>
          {schedule.tasks.map((task, index) => (
            <tr key={index}>
              <td>
                {
                  editable
                    ? <select value={task.sectionId}
                      onChange={
                        (e) => updateTask({ ...task, sectionId: e.target.value })
                      }>
                      {schedule.sections.map((section) => (
                        <option key={section.sectionId} value={section.sectionId}>{section.sectionName}</option>
                      ))}
                    </select>
                    : schedule.sections.find(section => section.sectionId === task.sectionId)?.sectionName
                }
              </td>
              <td>
                {
                  editable
                    ? <input type="text" value={task.taskName}
                      onChange={
                        (e) => updateTask({ ...task, taskName: e.target.value })
                      } />
                    : task.taskName
                }
              </td>
              <td>
                {
                  editable
                    ? <select value={task.status}
                      onChange={
                        (e) => {
                          switch (e.target.value) {
                            case "new":
                              {
                                switch (task.status) {
                                  case "active":
                                  case "done":
                                    updateTask({ ...task, status: "new", progress: 0 });
                                    break;
                                  case "milestone":
                                    updateTask({
                                      ...task,
                                      status: "new",
                                      progress: 0,
                                      scheduledStartDate: task.scheduledDate,
                                      scheduledEndDate: task.scheduledDate,
                                      personDays: 1
                                    });
                                  default:
                                    break;
                                }
                              }
                              break;
                            case "active":
                              switch (task.status) {
                                case "new":
                                case "done":
                                  updateTask({ ...task, status: "active", actualStartDate: task.scheduledStartDate });
                                  break;
                                case "milestone":
                                  updateTask({
                                    ...task,
                                    status: "active",
                                    progress: 0,
                                    scheduledStartDate: task.scheduledDate,
                                    scheduledEndDate: task.scheduledDate,
                                    personDays: 1,
                                    actualStartDate: task.actualDate ?? task.scheduledDate,
                                  });
                                  break;
                                default:
                                  break;
                              }
                              break;
                            case "done":
                              switch (task.status) {
                                case "new":
                                  updateTask({
                                    ...task,
                                    status: "done",
                                    actualStartDate: task.scheduledStartDate,
                                    actualEndDate: task.scheduledEndDate,
                                    progress: 100
                                  });
                                  break;
                                case "active":
                                  updateTask({
                                    ...task,
                                    status: "done",
                                    actualEndDate: task.scheduledEndDate,
                                    progress: 100
                                  });
                                  break;
                                case "milestone":
                                  updateTask({
                                    ...task,
                                    status: "done",
                                    progress: 100,
                                    scheduledStartDate: task.scheduledDate,
                                    scheduledEndDate: task.scheduledDate,
                                    personDays: 1,
                                    actualStartDate: task.actualDate ?? task.scheduledDate,
                                    actualEndDate: task.actualDate ?? task.scheduledDate,
                                  });
                                  break;
                                default:
                                  break;
                              }
                              break;
                            case "milestone":
                              if (task.status !== "milestone") {
                                updateTask({
                                  ...task,
                                  status: "milestone",
                                  scheduledDate: task.scheduledStartDate,
                                  actualDate: task.status === "done" ? task.actualEndDate : undefined,
                                });
                              }
                              break;
                            default:
                              break;
                          }
                        }
                      }>
                      <option value="new">新規</option>
                      <option value="active">進行中</option>
                      <option value="done">完了</option>
                      <option value="milestone">マイルストーン</option>
                    </select>
                    : (() => {
                      switch (task.status) {
                        case "new":
                          return "新規";
                        case "active":
                          return "進行中";
                        case "done":
                          return "完了";
                        case "milestone":
                          return "マイルストーン";
                      }
                    })()
                }
              </td>
              {
                task.status === "milestone"
                  ? <td colSpan={2}>
                    {
                      editable
                        ? <input type="date" value={task.scheduledDate.toISOString().split("T")[0]}
                          onChange={
                            (e) => updateTask({ ...task, scheduledDate: new Date(e.target.value) })
                          } />
                        : task.scheduledDate.toLocaleDateString()
                    }
                  </td>
                  : <>
                    <td>
                      {
                        editable
                          ? <input type="date" value={task.scheduledStartDate.toISOString().split("T")[0]}
                            onChange={
                              (e) => updateTask({ ...task, scheduledStartDate: new Date(e.target.value) })
                            } />
                          : task.scheduledStartDate.toLocaleDateString()
                      }
                    </td>
                    <td>
                      {
                        editable
                          ? <input type="date" value={task.scheduledEndDate.toISOString().split("T")[0]}
                            onChange={
                              (e) => updateTask({
                                ...task,
                                scheduledEndDate: new Date(e.target.value),
                                personDays: calculatePersonDays(task.scheduledStartDate, new Date(e.target.value))
                              })
                            } />
                          : task.scheduledEndDate.toLocaleDateString()
                      }
                    </td>
                  </>
              }
              <td>
                {
                  task.status === "milestone"
                    ? "N/A"
                    : editable
                      ? <input type="number" value={task.personDays}
                        onChange={
                          (e) => updateTask({
                            ...task,
                            scheduledEndDate: calculateEndDate(task.scheduledStartDate, Number(e.target.value)),
                            personDays: Number(e.target.value)
                          })
                        } />
                      : task.personDays
                }
              </td>
              {
                task.status === "milestone"
                  ? <td colSpan={2}>
                    {
                      editable
                        ? <input type="date" value={task.actualDate?.toISOString().split("T")[0]}
                          onChange={
                            (e) => updateTask({ ...task, actualDate: new Date(e.target.value) })
                          } />
                        : task.actualDate?.toLocaleDateString()
                    }
                  </td>
                  : <>
                    <td>
                      {
                        task.status === "new"
                          ? "N/A"
                          : editable
                            ? <input type="date" value={task.actualStartDate?.toISOString().split("T")[0]}
                              onChange={
                                (e) => updateTask({ ...task, actualStartDate: new Date(e.target.value) })
                              } />
                            : task.actualStartDate?.toLocaleDateString()
                      }
                    </td>
                    <td>
                      {
                        task.status === "new" || task.status === "active"
                          ? "N/A"
                          : editable
                            ? <input type="date" value={task.actualEndDate?.toISOString().split("T")[0]}
                              onChange={
                                (e) => updateTask({ ...task, actualEndDate: new Date(e.target.value) })
                              } />
                            : task.actualEndDate?.toLocaleDateString()
                      }
                    </td>
                  </>
              }
              <td>
                {
                  editable
                    ? <input type="text" value={task.assignee}
                      onChange={
                        (e) => updateTask({ ...task, assignee: e.target.value })
                      } />
                    : task.assignee
                }
              </td>
              <td>
                {
                  task.status === "milestone" ? "N/A" : `${task.progress}%`
                }
              </td>
              <td>
                <button
                  onClick={() => {
                    reorderTask(task.taskId, index - 1);
                  }} disabled={!editable || index === 0} >
                  ↑
                </button>
                <button
                  onClick={() => {
                    reorderTask(task.taskId, index + 1);
                  }} disabled={!editable || index === schedule.tasks.length - 1} >
                  ↓
                </button>
                <button
                  onClick={() => {
                    removeTask(task.taskId);
                  }} disabled={!editable} >
                  削除する
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};
