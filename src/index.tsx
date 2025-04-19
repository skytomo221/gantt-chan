import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const App = () => <div>Hello, React! <span>2</span></div>;

const container = document.getElementById("root");
if (container === null)
  throw new Error("No root element found in the document");
const root = createRoot(container);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
