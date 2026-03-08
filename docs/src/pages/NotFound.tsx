import React from "react";
import { Link } from "@tanstack/react-router";
import { Navbar } from "../components/navbar/Navbar";

export const NotFound: React.FC = () => {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Navbar />
      <div className="flex flex-col items-center gap-6 text-center max-w-2xl">
        <h1 className="text-8xl font-bold text-white drop-shadow-md">
          <span className="text-violet-400">404</span>
        </h1>
        <h2 className="text-4xl font-bold text-white drop-shadow-md">Page not found</h2>
        <p className="text-gray-300 text-lg">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link
          className="inline-flex items-center gap-2 px-6 py-3 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 rounded-lg text-violet-300 font-semibold transition-colors duration-200"
          to="/"
        >
          Go back home
        </Link>
      </div>
    </main>
  );
};
