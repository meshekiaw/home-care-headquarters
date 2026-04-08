import { useState, useRef, useEffect } from "react";
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

export default function OrientationSection({ title, content, audioUrl, onAudioComplete, audioCompleted }: OrientationSectionProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audioUrl) {
      // If no audio, mark as completed automatically
      onAudioComplete();
    }
  }, [audioUrl, onAudioComplete]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(pct);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(100);
    onAudioComplete();
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {audioUrl && (
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
                {audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"} / {duration > 0 ? formatTime(duration) : "--:--"}
              </span>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onLoadedMetadata={() => {
                if (audioRef.current) setDuration(audioRef.current.duration);
              }}
            />
          </div>
        )}

        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </CardContent>
    </Card>
  );
}
