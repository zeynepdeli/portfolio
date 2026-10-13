import ProjectsSection from "@/components/sections/ProjectsSection";
import FinalState from "@/components/ui/FinalState"

/* /projects — Header'daki PROJECTS butonuyla gelinir.
   Animasyon oynamaz: ekran kartı nehirden oluşmuş, avatar fanın
   ortasına oturmuş, büyük ekranda proje fotoğrafı görünen son hal. */
export default function ProjectsPage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <FinalState>
        <ProjectsSection finished />
      </FinalState>
    </main>
  );
}
