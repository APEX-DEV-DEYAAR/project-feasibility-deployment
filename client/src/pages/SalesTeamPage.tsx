import TeamCostPage from "./TeamCostPage";
import type { ProjectSummary } from "../types";

interface SalesTeamPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
}

export default function SalesTeamPage({ projects, onBack }: SalesTeamPageProps) {
  return (
    <TeamCostPage
      teamCode="sales"
      teamName="Sales Team"
      projects={projects}
      onBack={onBack}
    />
  );
}
