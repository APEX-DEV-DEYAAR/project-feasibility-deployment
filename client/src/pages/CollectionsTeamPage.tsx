import TeamCostPage from "./TeamCostPage";
import type { ProjectSummary } from "../types";

interface CollectionsTeamPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
  onNavigateToForecast?: () => void;
}

export default function CollectionsTeamPage({ projects, onBack, onLogout, onRefresh, onNavigateToForecast }: CollectionsTeamPageProps) {
  return (
    <TeamCostPage
      teamCode="collections"
      teamName="Collections Team"
      projects={projects}
      showCollections
      onBack={onBack}
      onLogout={onLogout}
      onRefresh={onRefresh}
      extraNavButtons={onNavigateToForecast ? [
        { label: "Collections Forecast", onClick: onNavigateToForecast },
      ] : undefined}
    />
  );
}
