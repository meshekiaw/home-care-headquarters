import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface OrientationSectionProps {
  title: string;
  content: string;
  audioUrl: string | null;
  onAudioComplete: () => void;
  audioCompleted: boolean;
}

export default function OrientationSection({ title, content, onAudioComplete, audioCompleted }: OrientationSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textRef = useRef("");
  const supportsTTS = typeof window !== "undefined" && "speechSynthesis" in window;

  // Strip HTML to get plain text for narration
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
    utt.rate = 0.95;
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
  }, [onAudioComplete]);

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
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Section Narration</span>
            {audioCompleted && (
              <span className="text-xs text-success font-medium ml-auto">✓ Listened</span>
            )}
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePlayPause}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              Browser Text-to-Speech
            </span>
          </div>
        </div>

        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </CardContent>
    </Card>
  );
}
