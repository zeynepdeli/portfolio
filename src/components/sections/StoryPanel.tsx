import PinConnector from "@/components/ui/PinConnector";

const items = [
  { key: "hikayem", label: "[HİKAYEM / MY STORY]" },
  { key: "yetenekler", label: "[YETENEKLER / SKILLS]" },
  { key: "projeler", label: "[PROJELER / PROJECTS]" },
];

export default function StoryPanel() {
  return (
    <div className="flex flex-col gap-4 w-fit">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="group flex flex-col text-left cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        >
          {/* Üst konnektör şeridi, sola yaslı */}
          <div className="pl-2">
            <PinConnector pins={10} orientation="horizontal" />
          </div>
          {/* İçerik kutusu */}
          <div
            className="border border-border bg-surface px-4 py-2 font-mono text-sm text-foreground -mt-1 transition-colors duration-150
                       group-hover:border-accent group-hover:bg-surface-hover group-hover:text-accent
                       group-active:bg-accent/10"
          >
            {item.label}
          </div>
        </button>
      ))}
    </div>
  );
}
