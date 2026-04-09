import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const SECTION_THEMES = [
  { gradient: "from-blue-500 to-blue-700", light: "bg-blue-50 dark:bg-blue-950/30", accent: "text-blue-600 dark:text-blue-400", progressBg: "bg-blue-200", progressFill: "bg-blue-500" },
  { gradient: "from-purple-500 to-purple-700", light: "bg-purple-50 dark:bg-purple-950/30", accent: "text-purple-600 dark:text-purple-400", progressBg: "bg-purple-200", progressFill: "bg-purple-500" },
  { gradient: "from-teal-500 to-teal-700", light: "bg-teal-50 dark:bg-teal-950/30", accent: "text-teal-600 dark:text-teal-400", progressBg: "bg-teal-200", progressFill: "bg-teal-500" },
  { gradient: "from-rose-500 to-rose-700", light: "bg-rose-50 dark:bg-rose-950/30", accent: "text-rose-600 dark:text-rose-400", progressBg: "bg-rose-200", progressFill: "bg-rose-500" },
  { gradient: "from-amber-500 to-amber-700", light: "bg-amber-50 dark:bg-amber-950/30", accent: "text-amber-600 dark:text-amber-400", progressBg: "bg-amber-200", progressFill: "bg-amber-500" },
  { gradient: "from-emerald-500 to-emerald-700", light: "bg-emerald-50 dark:bg-emerald-950/30", accent: "text-emerald-600 dark:text-emerald-400", progressBg: "bg-emerald-200", progressFill: "bg-emerald-500" },
  { gradient: "from-indigo-500 to-indigo-700", light: "bg-indigo-50 dark:bg-indigo-950/30", accent: "text-indigo-600 dark:text-indigo-400", progressBg: "bg-indigo-200", progressFill: "bg-indigo-500" },
  { gradient: "from-sky-500 to-sky-700", light: "bg-sky-50 dark:bg-sky-950/30", accent: "text-sky-600 dark:text-sky-400", progressBg: "bg-sky-200", progressFill: "bg-sky-500" },
  { gradient: "from-orange-500 to-orange-700", light: "bg-orange-50 dark:bg-orange-950/30", accent: "text-orange-600 dark:text-orange-400", progressBg: "bg-orange-200", progressFill: "bg-orange-500" },
  { gradient: "from-cyan-500 to-cyan-700", light: "bg-cyan-50 dark:bg-cyan-950/30", accent: "text-cyan-600 dark:text-cyan-400", progressBg: "bg-cyan-200", progressFill: "bg-cyan-500" },
  { gradient: "from-fuchsia-500 to-fuchsia-700", light: "bg-fuchsia-50 dark:bg-fuchsia-950/30", accent: "text-fuchsia-600 dark:text-fuchsia-400", progressBg: "bg-fuchsia-200", progressFill: "bg-fuchsia-500" },
  { gradient: "from-lime-500 to-lime-700", light: "bg-lime-50 dark:bg-lime-950/30", accent: "text-lime-600 dark:text-lime-400", progressBg: "bg-lime-200", progressFill: "bg-lime-500" },
  { gradient: "from-violet-500 to-violet-700", light: "bg-violet-50 dark:bg-violet-950/30", accent: "text-violet-600 dark:text-violet-400", progressBg: "bg-violet-200", progressFill: "bg-violet-500" },
  { gradient: "from-pink-500 to-pink-700", light: "bg-pink-50 dark:bg-pink-950/30", accent: "text-pink-600 dark:text-pink-400", progressBg: "bg-pink-200", progressFill: "bg-pink-500" },
];

interface OrientationSectionProps {
  title: string;
  content: string;
  audioUrl: string | null;
  onAudioComplete: () => void;
  audioCompleted: boolean;
  sectionNumber?: number;
}

function useFemaleVoice() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      const usVoices = voices.filter((v) => v.lang === "en-US" || v.lang === "en_US");
      const priority = ["samantha", "zira", "google us english"];
      let picked: SpeechSynthesisVoice | undefined;
      for (const kw of priority) {
        picked = usVoices.find((v) => v.name.toLowerCase().includes(kw));
        if (picked) break;
      }
      if (!picked) {
        const soft = ["victoria", "female", "tessa"];
        picked = usVoices.find((v) => soft.some((k) => v.name.toLowerCase().includes(k)));
      }
      const final = picked || usVoices[0] || null;
      if (final) setVoice(final);
    };

    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pick);
  }, []);

  return voice;
}

export default function OrientationSection({ title, content, onAudioComplete, audioCompleted, sectionNumber = 1 }: OrientationSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textRef = useRef("");
  const supportsTTS = typeof window !== "undefined" && "speechSynthesis" in window;
  const femaleVoice = useFemaleVoice();

  const theme = SECTION_THEMES[(sectionNumber - 1) % SECTION_THEMES.length];

  const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  textRef.current = plainText;

  const cleanup = useCallback(() => {
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
  }, []);

  useEffect(() => {
    if (!supportsTTS) {
      onAudioComplete();
    }
    return cleanup;
  }, [supportsTTS, onAudioComplete, cleanup]);

  const createUtterance = useCallback(() => {
    const utt = new SpeechSynthesisUtterance(textRef.current);
    utt.rate = 0.9;
    utt.pitch = 1.05;
    utt.volume = 0.85;
    if (femaleVoice) utt.voice = femaleVoice;
    utt.onboundary = (e) => {
      if (e.charIndex && textRef.current.length) {
        setProgress((e.charIndex / textRef.current.length) * 100);
      }
    };
    utt.onend = () => {
      setIsPlaying(false);
      setProgress(100);
      onAudioComplete();
    };
    utt.onerror = () => {
      setIsPlaying(false);
    };
    return utt;
  }, [onAudioComplete, femaleVoice]);

  const handlePlayPause = () => {
    if (!supportsTTS) return;
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        cleanup();
        const utt = createUtterance();
        utteranceRef.current = utt;
        window.speechSynthesis.speak(utt);
      }
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    if (!supportsTTS) return;
    cleanup();
    setProgress(0);
    const utt = createUtterance();
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
    setIsPlaying(true);
  };

  if (!supportsTTS) {
    return (
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className={`bg-gradient-to-r ${theme.gradient}`}>
          <CardTitle className="text-xl text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: content }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-lg border-0">
      <CardHeader className={`bg-gradient-to-r ${theme.gradient}`}>
        <CardTitle className="text-xl text-white drop-shadow-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className={`space-y-4 pt-6 ${theme.light}`}>
        <div className={`${theme.light} rounded-lg p-4 space-y-3`}>
          <div className="flex items-center gap-3">
            <Volume2 className={`w-5 h-5 ${theme.accent}`} />
            <span className="text-sm font-medium">Section Narration</span>
            {audioCompleted && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium ml-auto">✓ Listened</span>
            )}
          </div>
          <div className={`h-2 w-full rounded-full overflow-hidden ${theme.progressBg}`}>
            <div
              className={`h-full rounded-full transition-all duration-300 ${theme.progressFill}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePlayPause} className="border-current">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {femaleVoice ? femaleVoice.name : "Browser Text-to-Speech"}
            </span>
          </div>
        </div>

        <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: content }} />
      </CardContent>
    </Card>
  );
}
