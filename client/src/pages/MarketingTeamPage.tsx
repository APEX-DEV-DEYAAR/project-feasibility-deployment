import TeamCostPage from "./TeamCostPage";
import type { ProjectSummary } from "../types";

interface MarketingTeamPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
  extraNavButtons?: { label: string; onClick: () => void }[];
}

export default function MarketingTeamPage({ projects, onBack, onLogout, onRefresh, extraNavButtons }: MarketingTeamPageProps) {
  return (
    <TeamCostPage
      teamCode="marketing"
      teamName="Marketing Team"
      projects={projects}
      onBack={onBack}
      onLogout={onLogout}
      onRefresh={onRefresh}
      extraNavButtons={extraNavButtons}
    />
  );
}
