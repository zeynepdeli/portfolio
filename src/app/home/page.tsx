import HeroSection from "@/components/sections/HeroSection";

/* /home — Header'daki HOME butonuyla gelinir.
   Giriş animasyonu oynamaz: konnektörler ve portlar yanık, isim ve
   unvanlar yazılmış, sosyal ikonlar görünür, fiş sokette takılı.
   (Site ilk açıldığında "/" giriş animasyonunu oynatmaya devam eder.) */
export default function HomePage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <HeroSection finished />
    </main>
  );
}
