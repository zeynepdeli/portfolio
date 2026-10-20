import SiteFlow from "@/components/SiteFlow";

/* /projects — menüdeki PROJECTS. Fan oluşmuş son hali açılır;
   yukarı kaydırınca roadmap, aşağı kaydırınca footer gelir. */
export default function ProjectsPage() {
  return <SiteFlow start="projects" />;
}
