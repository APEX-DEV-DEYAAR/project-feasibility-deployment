import type { ReactNode } from "react";

interface SidebarSectionProps {
  title: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
}

export default function SidebarSection({ title, icon, isActive, onClick, children }: SidebarSectionProps) {
  return (
    <div className={`s-section ${isActive ? "active" : ""}`}>
      <div className="s-header" onClick={onClick}>
        <div className="s-icon">{icon}</div>
        <div className="s-title">{title}</div>
        <div className="s-chevron">{"\u25B6"}</div>
      </div>
      <div className="s-content">
        <div className="s-inner">{children}</div>
      </div>
    </div>
  );
}
