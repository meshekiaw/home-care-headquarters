import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const copyAll = () => {
    if (!result) return;
    const all = sections
      .map((s) => `=== ${s.label} ===\n${result[s.key] || ""}`)
      .join("\n\n");
    copy(all, "__all__");
  };

  return (
    <Card className="bg-slate-900 text-slate-100 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-slate-50 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sky-300" />
          {title}
        </CardTitle>
        {result && (
          <Button size="sm" variant="secondary" onClick={copyAll}>
            {copiedKey === "__all__" ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            Copy All
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!result ? (
          <p className="text-slate-400 text-sm italic">
            AI response will appear here after you click "Generate AI Response".
          </p>
        ) : (
          <Accordion
            type="multiple"
            defaultValue={sections.map((s) => s.key)}
            className="space-y-2"
          >
            {sections.map((s) => {
              const text = result[s.key] || "";
              return (
                <AccordionItem
                  key={s.key}
                  value={s.key}
                  className="rounded-md border border-slate-700 bg-slate-800/60 px-3 border-b"
                >
                  <div className="flex items-center justify-between gap-2">
                    <AccordionTrigger className="flex-1 py-3 hover:no-underline">
                      <span className="font-bold text-sky-300 text-sm uppercase tracking-wide text-left">
                        {s.label}
                      </span>
                    </AccordionTrigger>
                    {text && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-300 hover:text-white hover:bg-slate-700 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          copy(text, s.key);
                        }}
                      >
                        {copiedKey === s.key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                  <AccordionContent>
                    <pre className="whitespace-pre-wrap text-sm font-sans text-slate-100 pb-2">
                      {text || <span className="text-slate-500 italic">No content returned.</span>}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
