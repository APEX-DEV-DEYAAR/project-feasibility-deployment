import TeamCostPage from "./TeamCostPage";
import type { ProjectSummary } from "../types";

interface CollectionsTeamPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
}

export default function CollectionsTeamPage({ projects, onBack }: CollectionsTeamPageProps) {
  return (
    <TeamCostPage
      teamCode="collections"
      teamName="Collections Team"
      projects={projects}
      showCollections
      onBack={onBack}
    />
  );
}
