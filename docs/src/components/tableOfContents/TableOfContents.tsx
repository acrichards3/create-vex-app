import React from "react";
import { useMarkdownContent } from "../markdown/MarkdownContext";

interface Heading {
  id: string;
  level: number;
  text: string;
}

const extractHeadings = (markdown: string): Heading[] => {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Heading[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    if (!match[1] || !match[2]) continue;
    const level = match[1].length;
    const text = match[2].trim();
    // Create an ID from the heading text (lowercase, replace spaces with hyphens, remove special chars)
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    headings.push({ id, level, text });
  }

  return headings;
};

export const TableOfContents: React.FC = () => {
  const { content } = useMarkdownContent();
  const [activeId, setActiveId] = React.useState<string>("");
  const headings = React.useMemo(() => extractHeadings(content), [content]);
  const manualScrollRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (headings.length === 0) return;

    const headingElements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headingElements.length === 0) return;

    // Find the scrollable container
    const scrollContainer = headingElements[0]?.closest(".overflow-y-auto");

    if (!scrollContainer) return;

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    const checkActiveHeading = () => {
      if (manualScrollRef.current !== null) {
        return;
      }

      // Only handle the "at top" case - let IntersectionObserver handle the rest
      if (scrollContainer.scrollTop < 100) {
        setActiveId(headings[0]?.id ?? "");
      }
    };

    const throttledCheckActiveHeading = () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        checkActiveHeading();
        scrollTimeout = null;
      }, 100);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        // If we're performing a manual scroll (via click), don't let the
        // observer override the highlighted item until the scroll finishes.
        if (manualScrollRef.current !== null) {
          return;
        }

        // Skip if we're at the top (let scroll handler deal with it)
        if (scrollContainer.scrollTop < 100) {
          return;
        }

        // Pick the most visible intersecting heading (highest intersectionRatio)
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (best === null || entry.intersectionRatio > best.intersectionRatio) {
            best = entry;
          }
        }
        if (best) {
          setActiveId(best.target.id);
        }
      },
      {
        root: scrollContainer,
        rootMargin: "-100px 0px -66%",
        threshold: [0, 0.5, 1],
      },
    );

    headingElements.forEach((element) => {
      observer.observe(element);
    });

    // Check on scroll to handle top case (throttled)
    scrollContainer.addEventListener("scroll", throttledCheckActiveHeading, {
      passive: true,
    });
    // Initial check
    checkActiveHeading();

    return () => {
      headingElements.forEach((element) => {
        observer.unobserve(element);
      });
      scrollContainer.removeEventListener("scroll", throttledCheckActiveHeading);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Set active immediately and mark as manual scroll
      setActiveId(id);
      manualScrollRef.current = id;

      // Find the scrollable container (the content area)
      const scrollContainer = element.closest(".overflow-y-auto");
      if (scrollContainer) {
        // Get the current scroll position
        const currentScrollTop = scrollContainer.scrollTop;

        // Get positions relative to viewport
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Calculate the element's position relative to the container's content
        // elementRect.top is relative to viewport
        // containerRect.top is relative to viewport
        // currentScrollTop is the current scroll position
        // So: element position in content = (elementRect.top - containerRect.top) + currentScrollTop
        const elementPositionInContent = elementRect.top - containerRect.top + currentScrollTop;

        // Scroll to position with a small offset for spacing
        scrollContainer.scrollTo({
          behavior: "smooth",
          top: elementPositionInContent - 24,
        });

        // Clear the manual scroll flag after scroll completes (smooth scroll takes ~500ms)
        setTimeout(() => {
          manualScrollRef.current = null;
        }, 600);
      } else {
        // Fallback to scrollIntoView if container not found
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          manualScrollRef.current = null;
        }, 600);
      }
    }
  };

  return (
    <aside className="hidden xl:flex py-8 w-64 shrink-0 px-4">
      <div className="sticky top-24 flex flex-1 flex-col gap-2 max-h-[calc(100vh-8rem)] overflow-y-auto thin-scrollbar">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">On this page</h3>
        <nav className="flex flex-col gap-1">
          {headings.map((heading, index) => {
            const isActive = activeId === heading.id;
            const indentClass =
              heading.level === 1 ? "pl-3" : heading.level === 2 ? "pl-6" : heading.level === 3 ? "pl-10" : "pl-14";

            return (
              <button
                className={`flex flex-1 text-left rounded-md px-3 py-1.5 text-sm transition-colors duration-200 ${
                  isActive
                    ? "bg-white/10 font-semibold text-violet-300"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                } ${indentClass}`}
                key={`${heading.id}-${index}`}
                onClick={() => handleClick(heading.id)}
                type="button"
              >
                {heading.text}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
