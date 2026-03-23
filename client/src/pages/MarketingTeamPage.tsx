import TeamCostPage from "./TeamCostPage";
import type { ProjectSummary } from "../types";

interface MarketingTeamPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
}

export default function MarketingTeamPage({ projects, onBack, onLogout, onRefresh }: MarketingTeamPageProps) {
  return (
    <TeamCostPage
      teamCode="marketing"
      teamName="Finance Team"
      projects={projects}
      onBack={onBack}
      onLogout={onLogout}
      onRefresh={onRefresh}
    />
  );
}
