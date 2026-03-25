import TeamCostPage from "./TeamCostPage";
import type { ProjectSummary } from "../types";

interface CommercialTeamPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
  extraNavButtons?: { label: string; onClick: () => void }[];
}

export default function CommercialTeamPage({ projects, onBack, onLogout, onRefresh, extraNavButtons }: CommercialTeamPageProps) {
  return (
    <TeamCostPage
      teamCode="commercial"
      teamName="Commercial Team"
      projects={projects}
      onBack={onBack}
      onLogout={onLogout}
      onRefresh={onRefresh}
      extraNavButtons={extraNavButtons}
    />
  );
}
