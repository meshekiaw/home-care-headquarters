import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Section {
  key: string;
  label: string;
}

interface AiResponseCardProps {
  title: string;
  result: Record<string, string> | null;
  sections: Section[];
}

export function AiResponseCard({ title, result, sections }: AiResponseCardProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!result) return null;

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const copyAll = () => {
    const all = sections
      .map((s) => `=== ${s.label} ===\n${result[s.key] || ""}`)
      .join("\n\n");
    copy(all, "__all__");
  };

  return (
    <Card className="bg-slate-900 text-slate-100 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-slate-50">{title}</CardTitle>
        <Button size="sm" variant="secondary" onClick={copyAll}>
          {copiedKey === "__all__" ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          Copy All
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((s) => {
          const text = result[s.key] || "";
          if (!text) return null;
          return (
            <div key={s.key} className="rounded-md border border-slate-700 bg-slate-800/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sky-300 text-sm uppercase tracking-wide">{s.label}</h4>
                <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-700" onClick={() => copy(text, s.key)}>
                  {copiedKey === s.key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <pre className="whitespace-pre-wrap text-sm font-sans text-slate-100">{text}</pre>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
