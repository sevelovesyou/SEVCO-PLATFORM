import React from "react";
import { Link } from "wouter";
import { 
  BookOpen, ShoppingBag, Music, Folder, Briefcase, 
  Users, ArrowRight, Zap, Globe, Layers, ChevronRight,
  TrendingUp, Newspaper, Camera, Wrench, MoreHorizontal,
  PlayCircle, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const PLATFORM_SECTIONS = [
  { label: "Wiki", icon: BookOpen, accent: "from-blue-500/20", color: "text-blue-500" },
  { label: "Store", icon: ShoppingBag, accent: "from-red-700/20", color: "text-red-700" },
  { label: "Music", icon: Music, accent: "from-blue-600/20", color: "text-blue-600" },
  { label: "Projects", icon: Folder, accent: "from-green-500/20", color: "text-green-500" },
  { label: "Services", icon: Briefcase, accent: "from-sky-500/20", color: "text-sky-500" },
  { label: "Community", icon: Users, accent: "from-indigo-500/20", color: "text-indigo-500" },
];

export function ProductLauncher() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-500/30 font-sans overflow-x-hidden">
      
      {/* Floating User Snapshot Pill */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-2xl">
        <Avatar className="h-8 w-8 border border-white/20">
          <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <div className="flex flex-col hidden sm:flex">
          <span className="text-xs font-semibold">John Doe</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Studio Plan</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* 1. BRAND HERO - Full Viewport */}
      <section className="relative h-[100dvh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(190,0,7,0.15)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto space-y-8 mt-12">
          <div className="h-24 w-24 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] mb-4">
            <Globe className="h-12 w-12 text-black" />
          </div>
          
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter leading-none">
            SEVCO
          </h1>
          <p className="text-xl md:text-3xl text-zinc-400 max-w-2xl font-light tracking-wide">
            The Inspiration Company.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-8 w-full sm:w-auto">
            <Button size="lg" className="rounded-full h-14 px-10 text-lg bg-white text-black hover:bg-zinc-200">
              Enter the Platform
            </Button>
            <Button size="lg" variant="outline" className="rounded-full h-14 px-10 text-lg border-white/20 bg-transparent hover:bg-white/5">
              Explore the Wiki
            </Button>
          </div>
        </div>
        
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
          <ChevronRight className="h-8 w-8 rotate-90" />
        </div>
      </section>

      {/* 2. PLATFORM GRID - ~80vh Secondary Gateway */}
      <section className="min-h-[80vh] flex flex-col justify-center px-6 py-24 border-t border-white/5 bg-zinc-950">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Everything in one place.</h2>
            <p className="text-xl text-zinc-500 max-w-2xl mx-auto">Navigate the entire SEVCO universe from a single unified gateway.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {PLATFORM_SECTIONS.map((section, i) => (
              <div key={i} className="group cursor-pointer">
                <div className={`aspect-square rounded-3xl border border-white/10 bg-gradient-to-br ${section.accent} to-transparent p-6 flex flex-col items-center justify-center gap-4 transition-all duration-500 hover:scale-105 hover:border-white/20 hover:shadow-2xl`}>
                  <section.icon className={`h-12 w-12 ${section.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
                  <span className="text-lg font-semibold tracking-tight">{section.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alternating Feature Reveal Bands */}
      
      {/* Reveal 1: Charts Highlights */}
      <section className="py-32 px-6 bg-black border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_50%_50%_at_50%_0%,rgba(0,100,255,0.1)_0%,transparent_100%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center z-10 relative">
          <Badge variant="outline" className="mb-6 rounded-full px-4 py-1 border-blue-500/30 text-blue-400 bg-blue-500/10">Charts</Badge>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">The pulse of the platform.</h2>
          <p className="text-xl text-zinc-400 max-w-3xl mb-16">Real-time metrics on what's trending across SEVCO Records.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-zinc-900/50 border-white/10 p-6 flex items-center gap-4 backdrop-blur-sm rounded-2xl hover:bg-zinc-800/50 transition-colors">
                <div className="text-4xl font-black text-zinc-700">0{i}</div>
                <div className="h-16 w-16 bg-zinc-800 rounded-lg flex-shrink-0" />
                <div className="text-left flex-1">
                  <h4 className="font-bold text-lg leading-tight">Neon Nights</h4>
                  <p className="text-zinc-500 text-sm">The Midnight Crew</p>
                </div>
                <PlayCircle className="h-6 w-6 text-zinc-400" />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Transition: Wallpaper Band */}
      <section className="h-[40vh] w-full relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 opacity-60 mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center bg-fixed opacity-40 grayscale" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-zinc-950" />
        <div className="absolute inset-0 flex items-center justify-center">
           <h3 className="text-3xl md:text-5xl font-bold tracking-widest uppercase text-white/50 mix-blend-overlay">Cinematic Expansion</h3>
        </div>
      </section>

      {/* Reveal 2: Featured Article (Largest alternating band) */}
      <section className="py-32 px-6 bg-zinc-950 border-t border-white/5 relative overflow-hidden">
         <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden relative border border-white/10 group">
                <div className="absolute inset-0 bg-zinc-800 bg-[url('https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2000')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>
            </div>
            <div className="order-1 md:order-2 space-y-8">
              <Badge variant="outline" className="rounded-full px-4 py-1 border-white/20 text-white bg-white/5">Featured Editorial</Badge>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">The Architecture of Sound.</h2>
              <p className="text-xl text-zinc-400">Deep dive into the new studio workflows shaping the next generation of SEVCO Records releases. From raw tracking to final masters, see how the platform enables creation.</p>
              <Button className="rounded-full h-12 px-8 text-base bg-white text-black hover:bg-zinc-200">
                Read Article <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
         </div>
      </section>

      {/* Reveal 3: SEVCO Feed (Alternating rows) */}
      <section className="py-32 px-6 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">The Feed.</h2>
            <Button variant="ghost" className="text-zinc-400 hover:text-white">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
          
          <div className="space-y-24">
            {/* Row 1 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
               <div className="space-y-6">
                 <p className="text-sm text-zinc-500 uppercase tracking-widest font-semibold">Update • 2 hours ago</p>
                 <h3 className="text-3xl font-bold">New Platform Documentation</h3>
                 <p className="text-zinc-400 text-lg">We've entirely rewritten the Wiki guidelines to make contributing easier for everyone in the community.</p>
                 <Link href="/wiki" className="inline-flex items-center text-red-500 hover:text-red-400 font-medium">
                   Explore Wiki <ChevronRight className="ml-1 h-4 w-4" />
                 </Link>
               </div>
               <div className="aspect-[16/9] bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center relative">
                 <BookOpen className="h-16 w-16 text-zinc-700 absolute" />
                 <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent mix-blend-overlay" />
               </div>
            </div>
            {/* Row 2 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
               <div className="aspect-[16/9] bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center relative order-2 md:order-1">
                 <Music className="h-16 w-16 text-zinc-700 absolute" />
                 <div className="absolute inset-0 bg-gradient-to-bl from-purple-500/10 to-transparent mix-blend-overlay" />
               </div>
               <div className="space-y-6 order-1 md:order-2">
                 <p className="text-sm text-zinc-500 uppercase tracking-widest font-semibold">Release • Yesterday</p>
                 <h3 className="text-3xl font-bold">Studio Beta Access</h3>
                 <p className="text-zinc-400 text-lg">Pro and Studio plan members can now access the new collaborative tools directly from their dashboard.</p>
                 <Link href="/music" className="inline-flex items-center text-red-500 hover:text-red-400 font-medium">
                   View Details <ChevronRight className="ml-1 h-4 w-4" />
                 </Link>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reveal 4: Featured Products */}
      <section className="py-32 px-6 bg-zinc-950 border-t border-white/5">
         <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Official Gear.</h2>
              <p className="text-xl text-zinc-500">Apparel and accessories from the SEVCO universe.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "Core Logo Hoodie", price: 65, tag: "New" },
                { name: "Studio Reference Monitors", price: 199, tag: "Hardware" },
                { name: "Vinyl Slipmat Set", price: 25, tag: "Accessory" },
                { name: "Creator Cap", price: 30, tag: "Apparel" }
              ].map((prod, i) => (
                <div key={i} className="group relative rounded-2xl border border-white/10 bg-zinc-900/50 hover:bg-zinc-900 hover:border-white/20 transition-all overflow-hidden cursor-pointer">
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-white text-black hover:bg-zinc-200">{prod.tag}</Badge>
                  </div>
                  <div className="aspect-[4/5] bg-zinc-800 relative flex items-center justify-center overflow-hidden p-8">
                     <div className="w-full h-full bg-zinc-700/50 rounded-xl" />
                     <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-50" />
                  </div>
                  <div className="p-6 relative z-10 bg-zinc-900/80 backdrop-blur-sm border-t border-white/5">
                    <h4 className="font-bold text-lg text-white mb-1 truncate">{prod.name}</h4>
                    <p className="text-zinc-400">${prod.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
         </div>
      </section>

      {/* Reveal 5: Wiki Latest & What's New Strip */}
      <section className="py-24 px-6 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16">
          {/* Wiki Quiet Band */}
          <div>
             <div className="flex items-center gap-3 mb-8">
               <BookOpen className="h-6 w-6 text-zinc-500" />
               <h3 className="text-2xl font-bold">Latest from the Wiki</h3>
             </div>
             <div className="space-y-4">
               {[
                 "Platform Architecture Overview",
                 "Audio Mastering Standards 2026",
                 "Community Guidelines V3",
                 "Brand Asset Usage Rules"
               ].map((title, i) => (
                 <div key={i} className="group flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10">
                   <div className="flex items-center gap-4">
                     <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5 text-zinc-500 group-hover:text-white transition-colors">
                       <FileTextIcon className="h-4 w-4" />
                     </div>
                     <span className="font-medium text-zinc-300 group-hover:text-white">{title}</span>
                   </div>
                   <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
                 </div>
               ))}
             </div>
          </div>
          
          {/* Changelog Strip */}
          <div>
            <div className="flex items-center gap-3 mb-8">
               <Wrench className="h-6 w-6 text-zinc-500" />
               <h3 className="text-2xl font-bold">Platform Updates</h3>
             </div>
             <div className="relative border-l border-zinc-800 ml-4 space-y-8 pb-4">
               {[
                 { date: "Today", tag: "Feature", title: "New Video Player UI", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
                 { date: "Yesterday", tag: "Fix", title: "Resolved Safari Audio Glitch", color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
                 { date: "Oct 12", tag: "Improvement", title: "Faster Page Load Times", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" }
               ].map((item, i) => (
                 <div key={i} className="pl-8 relative">
                   <div className="absolute w-3 h-3 bg-zinc-900 border border-zinc-600 rounded-full -left-[6.5px] top-1.5" />
                   <p className="text-xs text-zinc-500 mb-2">{item.date}</p>
                   <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 border ${item.color} ${item.bg} ${item.border}`}>
                     {item.tag}
                   </div>
                   <p className="font-medium text-zinc-200">{item.title}</p>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </section>

      {/* Stacked Closing Screens */}
      
      {/* Community CTA (~70vh) */}
      <section className="h-[70vh] flex flex-col items-center justify-center px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 to-transparent opacity-40 pointer-events-none" />
        <div className="relative z-10 text-center max-w-3xl mx-auto space-y-8">
          <div className="inline-flex h-16 w-16 rounded-full bg-blue-500/20 items-center justify-center mb-4 ring-1 ring-blue-500/30">
             <Users className="h-8 w-8 text-blue-400" />
          </div>
          <h2 className="text-4xl md:text-7xl font-bold tracking-tighter">Find your people.</h2>
          <p className="text-xl md:text-2xl text-zinc-300 font-light">Join thousands of creators, listeners, and builders on the official SEVCO Discord.</p>
          <Button size="lg" className="rounded-full h-14 px-10 text-lg bg-blue-600 hover:bg-blue-500 text-white border-0">
            Join the Community
          </Button>
        </div>
      </section>

      {/* Sparks CTA (~70vh) */}
      <section className="h-[70vh] flex flex-col items-center justify-center px-6 relative overflow-hidden bg-black">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/60 via-black to-black opacity-60 pointer-events-none" />
        <div className="relative z-10 text-center max-w-3xl mx-auto space-y-8">
          <div className="inline-flex h-16 w-16 rounded-full bg-amber-500/20 items-center justify-center mb-4 ring-1 ring-amber-500/30">
             <Award className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-4xl md:text-7xl font-bold tracking-tighter">Fuel the ecosystem.</h2>
          <p className="text-xl md:text-2xl text-zinc-300 font-light">Earn and spend Sparks to support artists, unlock features, and participate in the platform.</p>
          <Button size="lg" className="rounded-full h-14 px-10 text-lg bg-amber-600 hover:bg-amber-500 text-white border-0">
            Learn about Sparks
          </Button>
        </div>
      </section>

      {/* Bulletin Marquee */}
      <div className="bg-red-900/20 border-y border-red-500/20 overflow-hidden py-3 flex items-center relative">
        <div className="absolute left-0 w-24 h-full bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 w-24 h-full bg-gradient-to-l from-black to-transparent z-10" />
        <div className="whitespace-nowrap animate-[marquee_20s_linear_infinite] flex gap-12 items-center px-4">
          {[1, 2, 3, 4, 5].map((i) => (
             <span key={i} className="flex items-center gap-4 text-sm font-semibold tracking-widest text-red-200">
               <Zap className="h-4 w-4 text-red-500" /> NEW STUDIO FEATURES LIVE NOW
               <span className="text-red-500/50">•</span>
               SEVCO RECORDS Q4 DROPS ANNOUNCED
               <span className="text-red-500/50">•</span>
             </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 bg-black text-center text-zinc-500 text-sm">
         <div className="flex items-center justify-center gap-6 mb-6">
           <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
           <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
           <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
         </div>
         <p>© {new Date().getFullYear()} SEVCO. All rights reserved.</p>
      </footer>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
}

function FileTextIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}
