import { useGlobalStateDispatch, useGlobalStateStore } from "./contexts/globalStateContext";

export const HolidayList = () => {
  const { schedule, editable } = useGlobalStateStore();
  const dispatch = useGlobalStateDispatch();

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

  return (
    <section>
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
    </section>
  );
};
