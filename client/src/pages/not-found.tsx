import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#0a0a12] text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-28 -left-36 w-[600px] h-[600px] rounded-full bg-red-800/20 blur-[120px] motion-safe:animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-28 -right-36 w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px] motion-safe:animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-blue-800/10 blur-[100px] motion-safe:animate-[pulse_12s_ease-in-out_infinite_4s]" />
      </div>

      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6" data-testid="not-found-content">
        <h1
          className="text-[8rem] md:text-[12rem] font-extrabold leading-none tracking-tighter bg-gradient-to-r from-blue-500 via-red-500 to-red-700 bg-clip-text text-transparent select-none"
          data-testid="text-404"
        >
          404
        </h1>
        <p className="text-xl md:text-2xl font-semibold text-white/80 mt-2 mb-2" data-testid="text-subtitle">
          Lost in the system
        </p>
        <p className="text-sm text-white/50 max-w-md mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button
            size="lg"
            className="bg-red-700 hover:bg-red-600 text-white font-semibold gap-2 px-6 shadow-lg"
            data-testid="button-return-home"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to base
          </Button>
        </Link>
      </div>
    </div>
  );
}
