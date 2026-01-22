import React, { useEffect, useMemo, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
} from "framer-motion";

const NAV_BAR_HEIGHT = 72;
const TOP_GAP = 84;
const COLLAPSED_VISIBLE_RATIO = 0.35;

const TRANSACTIONS = [
  {
    id: 1,
    title: "Subscribed to Dribbble Pro",
    subtitle: "12/06/24",
    amount: -25,
  },
  {
    id: 2,
    title: "Received from Nix",
    subtitle: "12/06/24",
    amount: 100,
  },
  {
    id: 3,
    title: "Coffee at Verve",
    subtitle: "11/06/24",
    amount: -6.5,
  },
  {
    id: 4,
    title: "Salary",
    subtitle: "10/06/24",
    amount: 3200,
  },
  {
    id: 5,
    title: "Apple Music",
    subtitle: "08/06/24",
    amount: -10.99,
  },
  {
    id: 6,
    title: "Refund from Zara",
    subtitle: "05/06/24",
    amount: 48,
  },
  {
    id: 7,
    title: "Uber ride",
    subtitle: "03/06/24",
    amount: -18.2,
  },
];

const formatAmount = (amount) =>
  `${amount >= 0 ? "+" : "-"}$${Math.abs(amount).toFixed(2)}`;

const TransactionSheet = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window === "undefined" ? 812 : window.innerHeight
  );
  const dragControls = useDragControls();

  const { sheetHeight, collapsedY } = useMemo(() => {
    const usableHeight = Math.max(
      viewportHeight - TOP_GAP - NAV_BAR_HEIGHT,
      360
    );
    const collapsedVisible = Math.max(
      viewportHeight * COLLAPSED_VISIBLE_RATIO,
      240
    );
    const collapsedOffset = Math.max(usableHeight - collapsedVisible, 0);
    return { sheetHeight: usableHeight, collapsedY: collapsedOffset };
  }, [viewportHeight]);
  const y = useMotionValue(collapsedY);

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const target = isExpanded ? 0 : collapsedY;
    const controls = animate(y, target, {
      type: "spring",
      stiffness: 320,
      damping: 32,
    });
    return () => controls.stop();
  }, [collapsedY, isExpanded, y]);

  useEffect(() => {
    document.body.style.overflow = isExpanded ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isExpanded]);

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleDragEnd = (_event, info) => {
    const velocity = info.velocity.y;
    const currentY = y.get();
    const shouldExpand =
      velocity < -500 || (Math.abs(velocity) < 500 && currentY < collapsedY / 2);
    setIsExpanded(shouldExpand);
  };

  const displayedTransactions = isExpanded
    ? TRANSACTIONS
    : TRANSACTIONS.slice(0, 3);
  const listMaxHeight = Math.max(sheetHeight - 110, 240);

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed inset-0 z-[40] bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            style={{ bottom: NAV_BAR_HEIGHT }}
          />
        )}
      </AnimatePresence>
      <motion.section
        className="fixed inset-x-0 z-[40] mx-auto w-full max-w-md rounded-t-[32px] bg-white px-4 pb-6 pt-3 shadow-2xl"
        style={{
          y,
          bottom: `calc(${NAV_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
          height: sheetHeight,
          paddingBottom: `calc(${NAV_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
        }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: collapsedY }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
      >
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          onPointerDown={(event) => dragControls.start(event)}
          onClick={handleToggle}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleToggle();
            }
          }}
          className="flex cursor-grab flex-col items-center gap-3 pb-2 pt-1 active:cursor-grabbing"
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-200" />
          <div className="flex w-full items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Transactions
            </h2>
          </div>
        </div>
        <div
          className={`mt-2 grid gap-4 text-xs ${
            isExpanded ? "overflow-y-auto" : "overflow-hidden"
          }`}
          style={{ maxHeight: listMaxHeight }}
        >
          {displayedTransactions.map((row) => (
            <div key={row.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                  {row.title.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {row.title}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {row.subtitle}
                  </p>
                </div>
              </div>
              <span
                className={
                  row.amount >= 0 ? "text-emerald-500" : "text-rose-500"
                }
              >
                {formatAmount(row.amount)}
              </span>
            </div>
          ))}
        </div>
      </motion.section>
    </>
  );
};

export default TransactionSheet;
