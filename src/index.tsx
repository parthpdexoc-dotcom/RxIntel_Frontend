import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/pageCardTheme.css";
import "./component/molecules/SearchInput.css";
import "./styles/modalTheme.css";
import "./styles/dashboardTheme.css";
import "./component/molecules/FormField.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

import { Provider } from "react-redux";
import { store } from "./app/store";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { rxTheme } from "./theme/rxBrand";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={rxTheme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);

reportWebVitals();
