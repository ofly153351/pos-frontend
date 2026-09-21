import type { ComponentType } from "react";

export type HelpCenterIconComponent = ComponentType<{ className?: string }>;

export type HelpCenterHelpCenterProps = {
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
