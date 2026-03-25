import TeamCostPage from "./TeamCostPage";
import type { ProjectSummary } from "../types";

interface CollectionsTeamPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
  extraNavButtons?: { label: string; onClick: () => void }[];
}

export default function CollectionsTeamPage({ projects, onBack, onLogout, onRefresh, extraNavButtons }: CollectionsTeamPageProps) {
  return (
    <TeamCostPage
      teamCode="collections"
      teamName="Collections Team"
      projects={projects}
      showCollections
      onBack={onBack}
      onLogout={onLogout}
      onRefresh={onRefresh}
      extraNavButtons={extraNavButtons}
    />
  );
}
