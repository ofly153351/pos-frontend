"use client";

import React, { useState, useMemo, type ComponentType } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Package,
  Rocket,
  Search,
  Settings2,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";

import {
  HELP_CATEGORIES,
  POPULAR_TOPIC_IDS,
  type HelpCategory,
  type HelpTopic,
} from "@/lib/help/help-topics";

type IconComponent = ComponentType<{ className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  rocket: Rocket,
  dashboard: LayoutDashboard,
  pos: CircleDollarSign,
  credit: CreditCard,
  docs: FileText,
  products: Package,
  warehouse: Boxes,
  purchasing: ShoppingCart,
  customers: Users,
  finance: BarChart3,
  settings: Settings2,
};

function CategoryIcon({ iconKey, size = 20, color }: { iconKey: string; size?: number; color?: string }) {
  const Icon = ICON_MAP[iconKey] ?? HelpCircle;
  return (
    <span style={{ display: "inline-flex", width: size, height: size, flexShrink: 0, color }}>
      <Icon className="w-full h-full" />
    </span>
  );
}

type HelpCenterProps = {
  labels: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    popularTopics: string;
    allCategories: string;
    steps: string;
    tips: string;
    back: string;
    backToCategory: string;
    noResults: string;
    noResultsDesc: string;
  };
};

export function HelpCenter({ labels }: HelpCenterProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<HelpCategory | null>(null);
  const [activeTopic, setActiveTopic] = useState<HelpTopic | null>(null);

  const popularTopics = useMemo(() =>
    POPULAR_TOPIC_IDS.flatMap(({ categoryId, topicId }) => {
      const cat = HELP_CATEGORIES.find((c) => c.id === categoryId);
      const topic = cat?.topics.find((t) => t.id === topicId);
      if (!cat || !topic) return [];
      return [{ cat, topic }];
    }),
    [],
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return HELP_CATEGORIES.flatMap((cat) =>
      cat.topics
        .filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.steps?.some((s) => s.toLowerCase().includes(q)) ||
            t.tips?.some((ti) => ti.toLowerCase().includes(q)),
        )
        .map((topic) => ({ cat, topic })),
    );
  }, [query]);

  function openCategory(cat: HelpCategory) {
    setActiveCategory(cat);
    setActiveTopic(null);
    setQuery("");
  }

  function openTopic(cat: HelpCategory, topic: HelpTopic) {
    setActiveCategory(cat);
    setActiveTopic(topic);
    setQuery("");
  }

  function backToCategories() {
    setActiveCategory(null);
    setActiveTopic(null);
  }

  function backToCategory() {
    setActiveTopic(null);
  }

  if (activeTopic && activeCategory) {
    return (
      <TopicDetail
        category={activeCategory}
        topic={activeTopic}
        labels={labels}
        onBack={backToCategory}
        onBackRoot={backToCategories}
      />
    );
  }

  if (activeCategory) {
    return (
      <CategoryView
        category={activeCategory}
        labels={labels}
        onBack={backToCategories}
        onOpenTopic={(topic) => openTopic(activeCategory, topic)}
      />
    );
  }

  return (
    <div className="smooth-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">{labels.title}</h1>
        <p className="text-sm text-slate-500">{labels.subtitle}</p>
      </div>

      <div className="relative mb-8 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="w-full rounded-xl border border-violet-200 bg-white py-3 pl-10 pr-10 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {query.trim() ? (
        <SearchResults
          results={searchResults}
          query={query}
          labels={labels}
          onOpenTopic={openTopic}
        />
      ) : (
        <>
          <section className="mb-10">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              {labels.allCategories}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {HELP_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => openCategory(cat)}
                  className="group flex flex-col items-start gap-2 rounded-xl border border-violet-100 bg-white p-4 text-left transition-all hover:border-violet-300 hover:shadow-sm"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                    style={{ background: cat.iconBg }}
                  >
                    <CategoryIcon iconKey={cat.iconKey} size={20} color={cat.iconColor} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-violet-700">
                      {cat.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 leading-[1.6]">
                      {cat.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              {labels.popularTopics}
            </p>
            <div className="divide-y divide-violet-50 rounded-xl border border-violet-100 bg-white overflow-hidden">
              {popularTopics.map(({ cat, topic }) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => openTopic(cat, topic)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-violet-50/60 transition-colors"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: cat.iconBg }}
                  >
                    <CategoryIcon iconKey={cat.iconKey} size={16} color={cat.iconColor} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{topic.title}</p>
                    <p className="text-xs text-slate-500 truncate">{cat.title}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SearchResults({
  results,
  query,
  labels,
  onOpenTopic,
}: {
  results: { cat: HelpCategory; topic: HelpTopic }[];
  query: string;
  labels: HelpCenterProps["labels"];
  onOpenTopic: (cat: HelpCategory, topic: HelpTopic) => void;
}) {
  if (!results.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <HelpCircle className="mb-3 h-10 w-10 text-violet-200" />
        <p className="text-sm font-medium text-slate-700">{labels.noResults}</p>
        <p className="mt-1 text-xs text-slate-500">{labels.noResultsDesc}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-xs text-slate-500">
        พบ {results.length} ผลลัพธ์สำหรับ &quot;{query}&quot;
      </p>
      <div className="divide-y divide-violet-50 rounded-xl border border-violet-100 bg-white overflow-hidden">
        {results.map(({ cat, topic }) => (
          <button
            key={`${cat.id}-${topic.id}`}
            type="button"
            onClick={() => onOpenTopic(cat, topic)}
            className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-violet-50/60 transition-colors"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: cat.iconBg }}
            >
              <CategoryIcon iconKey={cat.iconKey} size={16} color={cat.iconColor} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{topic.title}</p>
              <p className="text-xs text-slate-500">{cat.title} › {topic.description.slice(0, 60)}…</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoryView({
  category,
  labels,
  onBack,
  onOpenTopic,
}: {
  category: HelpCategory;
  labels: HelpCenterProps["labels"];
  onBack: () => void;
  onOpenTopic: (topic: HelpTopic) => void;
}) {
  return (
    <div className="smooth-fade-up">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {labels.back}
      </button>

      <div className="mb-8 flex items-center gap-4">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: category.iconBg }}
        >
          <CategoryIcon iconKey={category.iconKey} size={28} color={category.iconColor} />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{category.title}</h2>
          <p className="text-sm text-slate-500">{category.subtitle}</p>
        </div>
      </div>

      <div className="divide-y divide-violet-50 rounded-xl border border-violet-100 bg-white overflow-hidden">
        {category.topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onOpenTopic(topic)}
            className="flex w-full items-start gap-4 px-5 py-5 text-left hover:bg-violet-50/60 transition-colors"
          >
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{topic.title}</p>
              <p className="mt-1 text-xs text-slate-500 leading-[1.6]">{topic.description}</p>
            </div>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          </button>
        ))}
      </div>
    </div>
  );
}

function TopicDetail({
  category,
  topic,
  labels,
  onBack,
  onBackRoot,
}: {
  category: HelpCategory;
  topic: HelpTopic;
  labels: HelpCenterProps["labels"];
  onBack: () => void;
  onBackRoot: () => void;
}) {
  return (
    <div className="smooth-fade-up max-w-2xl">
      <nav className="mb-6 flex items-center gap-2 text-xs text-slate-500">
        <button type="button" onClick={onBackRoot} className="hover:text-violet-600">
          {labels.title}
        </button>
        <ChevronRight className="h-3 w-3" />
        <button type="button" onClick={onBack} className="hover:text-violet-600">
          {category.title}
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-700 font-medium">{topic.title}</span>
      </nav>

      <div className="mb-6 flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: category.iconBg }}
        >
          <CategoryIcon iconKey={category.iconKey} size={20} color={category.iconColor} />
        </span>
        <div>
          <p className="text-xs text-slate-500">{category.title}</p>
          <h2 className="text-lg font-semibold text-slate-900">{topic.title}</h2>
        </div>
      </div>

      <p className="mb-8 text-sm text-slate-600 leading-[1.8]">{topic.description}</p>

      {topic.steps?.length ? (
        <div className="mb-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
            {labels.steps}
          </p>
          <ol className="space-y-3">
            {topic.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 leading-[1.8] pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {topic.tips?.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-700">
            {labels.tips}
          </p>
          <ul className="space-y-2">
            {topic.tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-800">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-10 border-t border-violet-100 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.backToCategory}
        </button>
      </div>
    </div>
  );
}
