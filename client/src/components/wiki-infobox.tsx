import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, User, Disc3, ShoppingBag, Calendar, MapPin, Globe, Tag } from "lucide-react";

interface InfoboxField {
  label: string;
  value: string;
}

interface InfoboxProps {
  type: string;
  data: Record<string, any>;
  title: string;
}

const typeIcons: Record<string, typeof Music> = {
  artist: User,
  song: Music,
  album: Disc3,
  merchandise: ShoppingBag,
  event: Calendar,
  location: MapPin,
  general: Globe,
};

const typeColors: Record<string, string> = {
  artist: "bg-primary",
  song: "bg-chart-2",
  album: "bg-chart-4",
  merchandise: "bg-chart-3",
  event: "bg-chart-5",
  location: "bg-chart-1",
  general: "bg-muted",
};

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function WikiInfobox({ type, data, title }: InfoboxProps) {
  const Icon = typeIcons[type] || Globe;
  const headerBg = typeColors[type] || "bg-muted";

  if (!data || Object.keys(data).length === 0) return null;

  const fields: InfoboxField[] = Object.entries(data).map(([key, value]) => ({
    label: formatFieldLabel(key),
    value: String(value),
  }));

  return (
    <Card className="overflow-visible w-full">
      <div className={`${headerBg} px-4 py-3 rounded-t-md`}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-white" />
          <h3 className="font-semibold text-white text-sm">{title}</h3>
        </div>
      </div>
      <div className="divide-y divide-border">
        {fields.map((field, i) => (
          <div key={i} className="grid grid-cols-[120px_1fr] gap-2">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
              {field.label}
            </div>
            <div className="px-3 py-2 text-sm">
              {field.value.startsWith("http") ? (
                <a
                  href={field.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline decoration-primary/30 hover:decoration-primary/60 transition-colors text-xs break-all"
                  data-testid={`infobox-link-${i}`}
                >
                  {field.value}
                </a>
              ) : (
                <span className="text-sm">{field.value}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 flex items-center gap-1">
        <Tag className="h-3 w-3 text-muted-foreground" />
        <Badge variant="secondary" className="text-[10px]">
          {type}
        </Badge>
      </div>
    </Card>
  );
}
