import { useVoice, formatKey } from "@/contexts/voice-context";
import { Mic, MicOff, PhoneOff, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export function VoiceFloatingIndicator() {
  const { currentRoom, roster, micMuted, toggleMute, leaveRoom, outputVolume, setOutputVolume, prefs, pttActive } = useVoice();
  if (!currentRoom) return null;

  const speakers = roster.filter(r => r.speaking);

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border bg-background/95 backdrop-blur shadow-lg p-3 flex flex-col gap-2"
      data-testid="voice-floating-indicator"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`relative flex h-2 w-2 ${pttActive && !micMuted ? "" : ""}`}>
            <span className={`absolute inline-flex h-full w-full rounded-full ${pttActive && !micMuted ? "bg-green-500 motion-safe:animate-ping" : "bg-muted-foreground/40"}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${pttActive && !micMuted ? "bg-green-500" : "bg-muted-foreground/60"}`} />
          </span>
          <span className="text-xs font-medium truncate">Voice • {currentRoom}</span>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={leaveRoom} aria-label="Leave voice" data-testid="button-voice-leave">
          <PhoneOff className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {roster.slice(0, 8).map((r) => (
          <div
            key={r.clientId}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border ${r.speaking ? "border-green-500 bg-green-500/10" : "border-border bg-muted/40"}`}
            data-testid={`voice-roster-${r.clientId}`}
          >
            {r.micMuted ? <MicOff className="h-2.5 w-2.5 text-destructive" /> : <Mic className="h-2.5 w-2.5" />}
            <span className="truncate max-w-[60px]">{r.username || "?"}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={micMuted ? "destructive" : "secondary"}
          className="h-7 px-2 flex-1"
          onClick={toggleMute}
          data-testid="button-voice-toggle-mute"
        >
          {micMuted ? <MicOff className="h-3 w-3 mr-1" /> : <Mic className="h-3 w-3 mr-1" />}
          <span className="text-xs">{micMuted ? "Unmute" : `Hold ${formatKey(prefs.pttKey)}`}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Volume2 className="h-3 w-3 text-muted-foreground" />
        <Slider
          value={[Math.round(outputVolume * 100)]}
          onValueChange={(v) => setOutputVolume(v[0] / 100)}
          max={100}
          step={1}
          className="flex-1"
          data-testid="slider-voice-volume"
        />
        <span className="text-[10px] text-muted-foreground w-7 text-right">{Math.round(outputVolume * 100)}%</span>
      </div>
    </div>
  );
}
