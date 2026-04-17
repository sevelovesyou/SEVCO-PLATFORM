import { useVoice, formatKey } from "@/contexts/voice-context";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";

export function VoiceRoomControls({ roomKey, label }: { roomKey: string; label?: string }) {
  const { currentRoom, joinRoom, leaveRoom, micMuted, toggleMute, prefs, roster, pttActive } = useVoice();
  const inThisRoom = currentRoom === roomKey;
  const others = inThisRoom ? roster.filter(r => !r.isSelf) : [];

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border bg-muted/30" data-testid={`voice-room-controls-${roomKey}`}>
      {!inThisRoom ? (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => joinRoom(roomKey)} data-testid="button-join-voice">
          <Phone className="h-3 w-3 mr-1" /> Join voice {label ? `· ${label}` : ""}
        </Button>
      ) : (
        <>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${pttActive && !micMuted ? "bg-green-500 motion-safe:animate-pulse" : "bg-muted-foreground/40"}`} />
            In voice · {others.length + 1}
          </span>
          <Button
            size="sm"
            variant={micMuted ? "destructive" : "secondary"}
            className="h-7 text-xs"
            onClick={toggleMute}
            data-testid="button-voice-mute-inroom"
          >
            {micMuted ? <MicOff className="h-3 w-3 mr-1" /> : <Mic className="h-3 w-3 mr-1" />}
            {micMuted ? "Unmute" : `${formatKey(prefs.pttKey)} to talk`}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={leaveRoom} data-testid="button-leave-voice">
            <PhoneOff className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}
