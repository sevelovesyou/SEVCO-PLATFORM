import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useVoice } from "@/contexts/voice-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mic, Square, Radio, Send, Trash2, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminAnnouncementComposer() {
  const { toast } = useToast();
  const { startLiveAnnouncement, stopLiveAnnouncement, isBroadcastingLive } = useVoice();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number>(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const [liveTitle, setLiveTitle] = useState("");

  async function startRecord() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm; codecs=opus") ? "audio/webm; codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recRef.current = rec;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setDurationSec(Math.round((Date.now() - startedAtRef.current) / 1000));
        for (const t of stream.getTracks()) t.stop();
      };
      rec.start();
      setRecording(true);
    } catch (e: any) {
      toast({ title: "Mic access denied", description: e?.message, variant: "destructive" });
    }
  }

  function stopRecord() {
    recRef.current?.stop();
    setRecording(false);
  }

  function clearAudio() {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDurationSec(0);
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("title", title);
      if (body) fd.append("body", body);
      if (isPinned) fd.append("isPinned", "true");
      if (durationSec) fd.append("durationSec", String(durationSec));
      if (audioBlob) fd.append("audio", audioBlob, "announcement.webm");
      const res = await fetch("/api/announcements", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "Failed to publish");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Announcement published" });
      setTitle(""); setBody(""); setIsPinned(false); clearAudio();
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
    },
    onError: (e: any) => toast({ title: "Failed to publish", description: e?.message, variant: "destructive" }),
  });

  return (
    <Card data-testid="admin-announcement-composer">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> Broadcast announcement</CardTitle>
        <CardDescription>Send a recorded clip + text to all visitors, or go live.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live broadcast */}
        <div className="rounded-lg border p-3 bg-red-500/5 space-y-2">
          <div className="flex items-center gap-2">
            <Radio className={`h-4 w-4 ${isBroadcastingLive ? "text-red-500 motion-safe:animate-pulse" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium">Live broadcast</span>
          </div>
          <Input
            value={liveTitle}
            onChange={(e) => setLiveTitle(e.target.value)}
            placeholder="Live announcement title (e.g. System maintenance)"
            disabled={isBroadcastingLive}
            data-testid="input-live-title"
          />
          {!isBroadcastingLive ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => startLiveAnnouncement(liveTitle.trim() || "Live announcement")}
              data-testid="button-start-live"
            >
              <Mic className="h-3 w-3 mr-1" /> Go live
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={stopLiveAnnouncement} data-testid="button-stop-live">
              <Square className="h-3 w-3 mr-1" /> Stop broadcast
            </Button>
          )}
          <p className="text-[10px] text-muted-foreground">Streams your microphone live to every visitor with announcement audio enabled.</p>
        </div>

        {/* Recorded announcement */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="ann-title" className="text-xs">Title</Label>
            <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" data-testid="input-announcement-title" />
          </div>
          <div>
            <Label htmlFor="ann-body" className="text-xs">Message (optional)</Label>
            <Textarea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Optional written body" data-testid="textarea-announcement-body" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-2">
              <Switch checked={isPinned} onCheckedChange={setIsPinned} data-testid="switch-pin-announcement" />
              Pin as banner
            </Label>
            <span className="text-[10px] text-muted-foreground">Pinned shows as a top banner until dismissed.</span>
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              {!recording && !audioBlob && (
                <Button size="sm" variant="outline" onClick={startRecord} data-testid="button-record-audio">
                  <Mic className="h-3 w-3 mr-1" /> Record audio
                </Button>
              )}
              {recording && (
                <Button size="sm" variant="destructive" onClick={stopRecord} data-testid="button-stop-recording">
                  <Square className="h-3 w-3 mr-1" /> Stop ({Math.round((Date.now() - startedAtRef.current) / 1000)}s)
                </Button>
              )}
              {audioBlob && (
                <>
                  <audio controls src={audioUrl!} className="h-8 flex-1" />
                  <Button size="icon" variant="ghost" onClick={clearAudio} aria-label="Discard recording" data-testid="button-discard-audio">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Optional: attach a recorded voice clip (≤25 MB).</p>
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!title.trim() || submitMutation.isPending}
            className="w-full"
            data-testid="button-publish-announcement"
          >
            <Send className="h-3.5 w-3.5 mr-2" />
            {submitMutation.isPending ? "Publishing…" : "Publish announcement"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
