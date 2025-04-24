import { useState } from "react";

import { GanttChart } from "./GanttChart";
import { Schedule as ScheduleType, Section, Task } from "./types";
import { GlobalStateProvider, useGlobalStateDispatch, useGlobalStateStore } from "./contexts/globalStateContext";

export const Schedule = () => {
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

  const addSection = (newSection: Section) => {
    dispatch({
      type: "ADD_SECTION",
      payload: newSection,
    });
  }

  const updateSection = (updatedSection: Section) => {
    dispatch({
      type: "UPDATE_SECTION",
      payload: updatedSection,
    });
  }

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

  const addHoliday = (holiday: Date) => {
    dispatch({
      type: "ADD_HOLIDAY",
      payload: holiday,
    });
  }

  const removeHoliday = (holiday: Date) => {
    dispatch({
      type: "REMOVE_HOLIDAY",
      payload: holiday,
    });
  }

  const setSkipWeekends = (skip: boolean) => {
    dispatch({
      type: "SET_SKIP_WEEKENDS",
      payload: skip,
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
    <>
      <div>
        <button onClick={() => setEditable(!editable)}>{editable ? "編集を無効にする" : "編集を有効にする"}</button>
        <button
          onClick={() => {
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
          }}
        >
          読み込む
        </button>
        <button
          onClick={() => {
            const fileName = `schedule_${new Date().toISOString().split("T")[0]}.json`;
            const blob = new Blob([JSON.stringify(schedule, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          保存する
        </button>
      </div>
      <p>バージョン: {schedule.version}</p>
      <p>タスク数: {schedule.tasks.length}</p>
      <h3>休日一覧</h3>
      <div>
        <p>土日を除外する: <input type="checkbox" checked={schedule.skipWeekends} onChange={(e) => setSkipWeekends(e.target.checked)} /></p>
        <button
          onClick={() => {
            const newHoliday = new Date();
            newHoliday.setDate(newHoliday.getDate() + 1);
            addHoliday(newHoliday);
          }}>
          休日を追加する
        </button>
        <table>
          <thead>
            <tr>
              <th>休日</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schedule.holidays.map((holiday, index) => (
              <tr key={index}>
                <td>
                  {
                    editable
                      ? <input type="date" value={holiday.toISOString().split("T")[0]}
                        onChange={
                          (e) => {
                            const updatedHoliday = new Date(e.target.value);
                            removeHoliday(holiday);
                            addHoliday(updatedHoliday);
                          }
                        } />
                      : holiday.toLocaleDateString()
                  }
                </td>
                <td><button onClick={() => removeHoliday(holiday)}>削除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>セクション一覧</h3>
      <div>
        <button
          onClick={() => {
            const newSection: Section = {
              sectionId: Math.random().toString(36).substring(2, 15),
              sectionName: "",
            };
            addSection(newSection);
          }}>
          セクションを追加する
        </button>
        <table>
          <thead>
            <tr>
              <th>セクション</th>
              <th>タスク数</th>
              <th>工数</th>
              <th>進捗率</th>
            </tr>
          </thead>
          <tbody>
            {schedule.sections.map((section, index) => (
              <tr key={index}>
                <td>
                  {editable
                    ? <input type="text" value={section.sectionName}
                      onChange={
                        (e) => {
                          const updatedSection = { ...section, sectionName: e.target.value };
                          updateSection(updatedSection);
                        }
                      } />
                    : section.sectionName
                  }
                </td>
                <td>
                  {
                    schedule
                      .tasks
                      .filter(task => task.sectionId === section.sectionId).length
                  }
                </td>
                <td>
                  {
                    schedule.tasks
                      .filter(task => task.sectionId === section.sectionId)
                      .filter(task => task.status !== "milestone")
                      .map(task => task.personDays)
                      .reduce((acc, curr) => acc + curr, 0)
                  }
                </td>
                <td>
                  {
                    (() => {
                      const progressData = schedule.tasks
                        .filter(task => task.sectionId === section.sectionId)
                        .filter(task => task.status !== "milestone")
                        .map(task => ({ totalPersonDays: task.personDays, completedPersonDays: task.personDays * task.progress / 100 }))
                        .reduce((acc, curr) => ({
                          totalPersonDays: acc.totalPersonDays + curr.totalPersonDays,
                          completedPersonDays: acc.completedPersonDays + curr.completedPersonDays
                        }), { totalPersonDays: 0, completedPersonDays: 0 });
                      return progressData.totalPersonDays > 0
                        ? ((progressData.completedPersonDays / progressData.totalPersonDays) * 100).toFixed(2)
                        : 0;
                    })()
                  }%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>タスク一覧</h3>
      <div>
        <button
          onClick={() => {
            const newTask: Task = {
              sectionId: schedule.sections[0].sectionId,
              taskId: Math.random().toString(36).substring(2, 15),
              taskName: "新しいタスク",
              status: "new",
              scheduledStartDate: new Date(),
              scheduledEndDate: new Date(),
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
    </>
  );
};
