import TeamCostPage from "./TeamCostPage";
import type { ProjectSummary } from "../types";

interface SalesTeamPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
  extraNavButtons?: { label: string; onClick: () => void }[];
}

export default function SalesTeamPage({ projects, onBack, onLogout, onRefresh, extraNavButtons }: SalesTeamPageProps) {
  return (
    <TeamCostPage
      teamCode="sales"
      teamName="Sales Team"
      projects={projects}
      onBack={onBack}
      onLogout={onLogout}
      onRefresh={onRefresh}
      extraNavButtons={extraNavButtons}
    />
  );
}
