import { Section } from "./types";
import { useGlobalStateDispatch, useGlobalStateStore } from "./contexts/globalStateContext";

export const SectionList = () => {
  const { schedule, editable } = useGlobalStateStore();
  const dispatch = useGlobalStateDispatch();

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

  return (
    <section>
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
    </section>
  );
};
