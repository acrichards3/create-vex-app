import React from "react";
import { Navbar } from "../components/navbar/Navbar";

export const Docs: React.FC = () => {
  return (
    <main className="relative flex flex-1 flex-col items-center gap-8 justify-start px-4 py-12">
      <Navbar />
      <div className="flex flex-col items-center gap-4 max-w-4xl text-center">
        <h1 className="text-5xl font-bold text-white drop-shadow-md">Vex Docs</h1>
        <p className="text-gray-300 text-lg">
          Welcome to the documentation. This is a starter page routed via TanStack Router. Add sections and content
          here.
        </p>
      </div>
    </main>
  );
};
