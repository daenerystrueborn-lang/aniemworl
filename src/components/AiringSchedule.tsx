import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, Tv, Clock, ChevronRight } from "lucide-react";
import { fetchAiringSchedule, type AiringEntry } from "@/lib/anilist-auth";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function getWeekDates(): Date[] {
  const today = new Date();
  const todayDay = today.getDay(); // 0 = Sunday
  return DAYS.map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + (i - todayDay));
    return d;
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ScheduleEntry({ entry }: { entry: AiringEntry }) {
  return (
    <Link
      href={`/wiki/${entry.media.id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors group"
    >
      <div className="w-10 h-14 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
        {entry.media.cover ? (
          <img
            src={entry.media.cover}
            alt={entry.media.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tv className="w-4 h-4 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate group-hover:text-accent transition-colors">
          {entry.media.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-accent font-bold bg-accent/10 px-1.5 py-0.5 rounded">
            EP {entry.episode}
          </span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {entry.media.format}
          </span>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="w-3 h-3" />
        {formatTime(entry.airingAt)}
      </div>
    </Link>
  );
}

function DaySchedule({ date }: { date: Date }) {
  const dateStr = date.toISOString().split("T")[0];
  const { data, isLoading, isError } = useQuery<AiringEntry[]>({
    queryKey: ["airing-schedule", dateStr],
    queryFn: () => fetchAiringSchedule(date),
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
        <Tv className="w-6 h-6 text-muted-foreground/30" />
        <p className="text-xs">No airing anime found for this day.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-1">
      {data.map((entry) => (
        <ScheduleEntry key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

export default function AiringSchedule() {
  const weekDates = useMemo(() => getWeekDates(), []);
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today);

  return (
    <section>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse shadow-sm shadow-accent/50" />
          Weekly Schedule
        </h2>
        <Link
          href="/anime"
          className="text-xs text-muted-foreground hover:text-accent flex items-center gap-0.5 transition-colors group"
        >
          All anime <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-3 scrollbar-none -mx-1 px-1">
        {DAYS.map((day, i) => {
          const isToday = i === today;
          const isSelected = i === selectedDay;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                isSelected
                  ? "bg-accent text-accent-foreground border-accent shadow-lg shadow-accent/20"
                  : isToday
                  ? "border-accent/40 text-accent bg-accent/5 hover:bg-accent/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <span className="font-bold">{day.slice(0, 3)}</span>
              <span className="text-[9px] opacity-75">{formatShortDate(weekDates[i])}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded-2xl p-2 sm:p-3">
        <DaySchedule date={weekDates[selectedDay]} />
      </div>
    </section>
  );
}
