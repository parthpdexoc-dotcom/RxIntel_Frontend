import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./TabSlider.css";

export type TabSliderItem = {
  id: string;
  label: string;
};

type TabSliderProps = {
  tabs: TabSliderItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  ariaLabel?: string;
};

function TabSlider({
  tabs,
  activeTab,
  onChange,
  className = "",
  ariaLabel = "Tabs",
}: TabSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ width: 0, x: 0 });

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeTab)
  );

  useLayoutEffect(() => {
    const tabEl = tabRefs.current[activeIndex];
    const containerEl = containerRef.current;
    if (!tabEl || !containerEl) return;

    setIndicator({
      width: tabEl.offsetWidth,
      x: tabEl.offsetLeft,
    });
  }, [activeIndex, tabs]);

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const syncIndicator = () => {
      const tabEl = tabRefs.current[activeIndex];
      if (!tabEl) return;

      setIndicator({
        width: tabEl.offsetWidth,
        x: tabEl.offsetLeft,
      });
    };

    const observer = new ResizeObserver(syncIndicator);
    observer.observe(containerEl);
    window.addEventListener("resize", syncIndicator);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncIndicator);
    };
  }, [activeIndex, tabs]);

  return (
    <div
      ref={containerRef}
      className={`tab-slider ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      <span
        className="tab-slider__indicator"
        aria-hidden
        style={{
          width: indicator.width,
          transform: `translateX(${indicator.x}px)`,
        }}
      />
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab-slider__tab${isActive ? " tab-slider__tab--active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default TabSlider;
