import RoadmapSection from "@/components/sections/RoadmapSection";
import FinalState from "@/components/ui/FinalState";

/* /roadmap — Header'daki SKILLS butonuyla gelinir.
   Animasyon oynamaz: tüm yetenekler toplanmış, yetenekler paneli
   yanmış son hali sabit olarak görünür. */
export default function RoadmapPage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <FinalState>
        <RoadmapSection finished />
      </FinalState>
    </main>
  );
}
