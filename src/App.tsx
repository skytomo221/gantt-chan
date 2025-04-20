import { useState } from "react";

import { GanttChart } from "./GanttChart";
import { Schedule, Section, Task } from "./types";

export const App = () => {
  const [isEditable, setIsEditable] = useState(false);
  const [schedule, setSchedule] = useState<Schedule>({
    version: "1.0",
    sections: [
      { sectionId: "a", sectionName: "セクション1" },
      { sectionId: "b", sectionName: "セクション2" },
      { sectionId: "c", sectionName: "セクション3" },
    ],
    tasks: [
      {
        sectionId: "a",
        taskName: "タスク1",
        scheduledStartDate: new Date("2025-01-01"),
        scheduledEndDate: new Date("2025-01-31"),
        personDays: 31,
        actualStartDate: new Date("2025-01-02"),
        actualEndDate: new Date("2025-01-30"),
        assignee: "山田太郎",
        progress: 50,
      },
      {
        sectionId: "b",
        taskName: "タスク2",
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
        taskName: "タスク3",
        scheduledStartDate: new Date("2025-03-01"),
        scheduledEndDate: new Date("2025-03-31"),
        personDays: 31,
        actualStartDate: undefined,
        actualEndDate: undefined,
        assignee: "鈴木一郎",
        progress: 0,
      },
    ]
  });

  const updateTask = (index: number, updatedTask: Task) => {
    setSchedule((prevSchedule) => {
      const updatedTasks = [...prevSchedule.tasks];
      updatedTasks[index] = updatedTask;
      return { ...prevSchedule, tasks: updatedTasks };
    });
  }

  return (
    <>
      <header><h1>ガントちゃん</h1></header>
      <div>
        <button onClick={() => setIsEditable(!isEditable)}>{isEditable ? "編集を無効にする" : "編集を有効にする"}</button>
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
                  const parsedSchedule: Schedule = {
                    ...raw,
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
      <h3>セクション一覧</h3>
      <div>
        <button
          onClick={() => {
            const newSection: Section = {
              sectionId: Math.random().toString(36).substring(2, 15),
              sectionName: "",
            };
            setSchedule((prevSchedule) => ({
              ...prevSchedule,
              sections: [...prevSchedule.sections, newSection],
            }));
          }
        }>
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
                  {isEditable
                    ? <input type="text" value={section.sectionName}
                      onChange={
                        (e) => {
                          const updatedSections = [...schedule.sections];
                          updatedSections[index].sectionName = e.target.value;
                          setSchedule({ ...schedule, sections: updatedSections });
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
                      .map(task => task.personDays)
                      .reduce((acc, curr) => acc + curr, 0)
                  }
                </td>
                <td>
                  {
                    (() => {
                      const progressData = schedule.tasks
                        .filter(task => task.sectionId === section.sectionId)
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
              taskName: "",
              scheduledStartDate: new Date(),
              scheduledEndDate: new Date(),
              personDays: 0,
              actualStartDate: undefined,
              actualEndDate: undefined,
              assignee: "",
              progress: 0,
            };
            setSchedule((prevSchedule) => ({
              ...prevSchedule,
              tasks: [...prevSchedule.tasks, newTask],
            }));
          }}>
          タスクを追加する
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>セクション</th>
            <th>タスク</th>
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
                  isEditable
                    ? <select value={task.sectionId}
                      onChange={
                        (e) => updateTask(index, { ...task, sectionId: e.target.value })
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
                  isEditable
                    ? <input type="text" value={task.taskName}
                      onChange={
                        (e) => updateTask(index, { ...task, taskName: e.target.value })
                      } />
                    : task.taskName
                }
              </td>
              <td>
                {
                  isEditable
                    ? <input type="date" value={task.scheduledStartDate.toISOString().split("T")[0]}
                      onChange={
                        (e) => updateTask(index, { ...task, scheduledStartDate: new Date(e.target.value) })
                      } />
                    : task.scheduledStartDate.toLocaleDateString()
                }
              </td>
              <td>
                {
                  isEditable
                    ? <input type="date" value={task.scheduledEndDate.toISOString().split("T")[0]}
                      onChange={
                        (e) => updateTask(index, {
                          ...task,
                          scheduledEndDate: new Date(e.target.value),
                          personDays: Math.ceil((new Date(e.target.value).getTime() - task.scheduledStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                        })
                      } />
                    : task.scheduledEndDate.toLocaleDateString()
                }
              </td>
              <td>
                {
                  isEditable
                    ?
                    <input type="number" value={task.personDays}
                      onChange={
                        (e) => updateTask(index, {
                          ...task,
                          scheduledEndDate: new Date(task.scheduledStartDate.getTime() + Number(e.target.value) * 24 * 60 * 60 * 1000 - 1),
                          personDays: Number(e.target.value)
                        })
                      } />
                    : task.personDays
                }
              </td>
              <td>
                {
                  isEditable
                    ? <input type="date" value={task.actualStartDate?.toISOString().split("T")[0]}
                      onChange={
                        (e) => updateTask(index, { ...task, actualStartDate: new Date(e.target.value) })
                      } />
                    : task.actualStartDate?.toLocaleDateString()
                }
              </td>
              <td>
                {
                  isEditable
                    ? <input type="date" value={task.actualEndDate?.toISOString().split("T")[0]}
                      onChange={
                        (e) => updateTask(index, { ...task, actualEndDate: new Date(e.target.value) })
                      } />
                    : task.actualEndDate?.toLocaleDateString()
                }
              </td>
              <td>
                {
                  isEditable
                    ? <input type="text" value={task.assignee}
                      onChange={
                        (e) => updateTask(index, { ...task, assignee: e.target.value })
                      } />
                    : task.assignee
                }
              </td>
              <td>
                {
                  isEditable
                    ? <input type="number" value={task.progress}
                      onChange={
                        (e) => updateTask(index, { ...task, progress: Number(e.target.value) })
                      } />
                    : `${task.progress}%`
                }
              </td>
              <td>
                <button
                  onClick={() => {
                    setSchedule((prevSchedule) => {
                      const updatedTasks = [...prevSchedule.tasks];
                      if (index > 0) {
                        const temp = updatedTasks[index - 1];
                        updatedTasks[index - 1] = updatedTasks[index];
                        updatedTasks[index] = temp;
                      }
                      return { ...prevSchedule, tasks: updatedTasks };
                    });
                  }} disabled={!isEditable} >
                  ↑
                </button>
                <button
                  onClick={() => {
                    setSchedule((prevSchedule) => {
                      const updatedTasks = [...prevSchedule.tasks];
                      if (index < updatedTasks.length - 1) {
                        const temp = updatedTasks[index + 1];
                        updatedTasks[index + 1] = updatedTasks[index];
                        updatedTasks[index] = temp;
                      }
                      return { ...prevSchedule, tasks: updatedTasks };
                    });
                  }} disabled={!isEditable} >
                  ↓
                </button>
                <button
                  onClick={() => {
                    setSchedule((prevSchedule) => {
                      const updatedTasks = [...prevSchedule.tasks];
                      updatedTasks.splice(index, 1);
                      return { ...prevSchedule, tasks: updatedTasks };
                    });
                  }} disabled={!isEditable} >
                  削除する
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <GanttChart schedule={schedule} />
      <footer>skytomo © 2025</footer>
    </>
  );
};
