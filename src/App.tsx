import { useState } from "react";

import { GanttChart } from "./GanttChart";
import { GlobalStateProvider } from "./contexts/globalStateContext";
import { Schedule as Schedule } from "./Schedule";

export const App = () => {
  return (
    <GlobalStateProvider>
      <header><h1>ガントちゃん</h1></header>
      <main>
        <GanttChart />
        <Schedule />
      </main>
      <footer>skytomo © 2025</footer>
    </GlobalStateProvider>
  );
};
