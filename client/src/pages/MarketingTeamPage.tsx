import TeamCostPage from "./TeamCostPage";
import type { ProjectSummary } from "../types";

interface MarketingTeamPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
}

export default function MarketingTeamPage({ projects, onBack }: MarketingTeamPageProps) {
  return (
    <TeamCostPage
      teamCode="marketing"
      teamName="Marketing Team"
      projects={projects}
      onBack={onBack}
    />
  );
}
