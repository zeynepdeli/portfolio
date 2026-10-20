import SiteFlow from "@/components/SiteFlow";

/* "/" — site ilk açıldığında hikâye kendiliğinden oynar:
   Hero → Roadmap → Projects → Footer. Bitince kaydırarak gezilir. */
export default function Home() {
  return <SiteFlow start="story" />;
}
