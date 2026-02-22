import "./index.css";
import App from "./App";
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "@hono/auth-js/react";
import { raise } from "@thunder-app/lib";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") ?? raise("Root element not found")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
