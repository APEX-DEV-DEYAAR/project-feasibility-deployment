import TeamCostPage from "./TeamCostPage";
import type { ProjectSummary } from "../types";

interface CommercialTeamPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
}

export default function CommercialTeamPage({ projects, onBack }: CommercialTeamPageProps) {
  return (
    <TeamCostPage
      teamCode="commercial"
      teamName="Commercial Team"
      projects={projects}
      onBack={onBack}
    />
  );
}
