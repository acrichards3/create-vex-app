import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { FaGithub, FaXTwitter } from "react-icons/fa6";
import { FiMenu, FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Navbar } from "../navbar/Navbar";
import { Sidebar } from "../sidebar/Sidebar";
import { SidebarContent, getAllNavigationItems } from "../sidebar/SidebarContent";
import { TableOfContents } from "../tableOfContents/TableOfContents";
import { MarkdownContext } from "../markdown/MarkdownContext";

interface DocsContainerProps {
  children: React.ReactNode;
}

const extractMarkdownContent = (children: React.ReactNode): string => {
  let content = "";
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      const props = child.props as {
        children?: React.ReactNode;
        content?: string;
      };
      if (props.content && typeof props.content === "string") {
        content = props.content;
      } else if (props.children) {
        const nestedContent = extractMarkdownContent(props.children);
        if (nestedContent) {
          content = nestedContent;
        }
      }
    }
  });
  return content;
};

export const DocsContainer: React.FC<DocsContainerProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();
  const currentPath = location.pathname;
  const markdownContent = React.useMemo(() => extractMarkdownContent(children), [children]);

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const allItems = getAllNavigationItems();
  const currentIndex = allItems.findIndex((item) => item.href === currentPath);
  const previousItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextItem = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

  return (
    <main className="relative flex min-h-screen flex-col">
      <div className="hidden md:block">
        <Navbar />
      </div>
      {/* Mobile hamburger button */}
      <button
        aria-label="Toggle mobile menu"
        className="fixed top-8 left-8 z-50 md:hidden p-2 text-white hover:text-violet-300 transition-colors duration-200"
        onClick={() => {
          setIsMobileMenuOpen(!isMobileMenuOpen);
        }}
        type="button"
      >
        {isMobileMenuOpen ? <FiX className="h-8 w-8" /> : <FiMenu className="h-8 w-8" />}
      </button>
      {/* Mobile navbar with social icons only */}
      <nav className="fixed top-8 right-8 z-50 flex items-center gap-4 md:hidden pointer-events-auto">
        <a
          aria-label="Open GitHub repository"
          className="text-white/80 hover:text-white transition-colors duration-200"
          href="https://github.com/acrichards3/create-vex-app"
          rel="noopener noreferrer"
          target="_blank"
        >
          <FaGithub className="h-8 w-8 drop-shadow" />
        </a>
        <a
          aria-label="Open X profile"
          className="text-white/80 hover:text-white transition-colors duration-200"
          href="https://x.com/Acricha3"
          rel="noopener noreferrer"
          target="_blank"
        >
          <FaXTwitter className="h-8 w-8 drop-shadow" />
        </a>
      </nav>
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={handleCloseMobileMenu} />
          <aside className="fixed top-0 left-0 h-full w-80 bg-black/95 border-r border-violet-500/20 z-40 overflow-y-auto md:hidden">
            <div className="flex items-center justify-between px-4 pt-8 pb-4">
              <div className="w-10 h-10" />
              <Link
                aria-label="Go to home"
                className="transition-opacity duration-200 hover:opacity-80"
                onClick={handleCloseMobileMenu}
                to="/"
              >
                <img alt="Vex App Logo" className="h-10 w-10 drop-shadow-lg" src="/logos/vex-app.png" />
              </Link>
            </div>
            <div className="flex flex-col gap-8 px-4 pb-8">
              <SidebarContent onLinkClick={handleCloseMobileMenu} />
            </div>
          </aside>
        </>
      )}
      <MarkdownContext.Provider value={{ content: markdownContent }}>
        <div className="flex flex-1 pt-24 basis-0 overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col items-start gap-8 px-4 md:px-8 py-12 overflow-y-auto thin-scrollbar">
            {children}
            {previousItem !== null || nextItem !== null ? (
              <div className="flex w-full items-center gap-4 border-t border-violet-500/20 pt-8 mt-8">
                {previousItem && (
                  <Link
                    className="group flex flex-1 items-center gap-3 rounded-lg border border-violet-500/20 bg-white/5 px-4 py-3 transition-colors duration-200 hover:border-violet-500/40 hover:bg-white/10"
                    to={previousItem.href}
                  >
                    <FiChevronLeft className="h-5 w-5 text-violet-400 transition-transform duration-200 group-hover:-translate-x-1" />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400">Previous</span>
                      <span className="font-semibold text-white">{previousItem.title}</span>
                    </div>
                  </Link>
                )}
                {nextItem && (
                  <Link
                    className={`group flex items-center justify-end gap-3 rounded-lg border border-violet-500/20 bg-white/5 px-4 py-3 transition-colors duration-200 hover:border-violet-500/40 hover:bg-white/10 ${
                      previousItem ? "flex-1" : "w-full"
                    }`}
                    to={nextItem.href}
                  >
                    <div className="flex flex-col text-right">
                      <span className="text-xs text-gray-400">Next</span>
                      <span className="font-semibold text-white">{nextItem.title}</span>
                    </div>
                    <FiChevronRight className="h-5 w-5 text-violet-400 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                )}
              </div>
            ) : null}
          </div>
          <TableOfContents />
        </div>
      </MarkdownContext.Provider>
    </main>
  );
};
