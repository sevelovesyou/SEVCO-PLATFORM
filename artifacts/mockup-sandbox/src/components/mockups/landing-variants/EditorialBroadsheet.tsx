import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, BookOpen, ChevronRight, Folder, Music, Play, ShoppingBag, TrendingUp, Users, Wrench, Zap } from "lucide-react";

export function EditorialBroadsheet() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-white/30 font-sans pb-0">
      {/* Top Strip */}
      <header className="h-[80px] border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-50 bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">SEVCO</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-white/60">
            <a href="#" className="hover:text-white transition-colors">Platform</a>
            <a href="#" className="hover:text-white transition-colors">Wiki</a>
            <a href="#" className="hover:text-white transition-colors">Store</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Avatar className="w-6 h-6">
              <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-semibold leading-none">J. Doe</span>
              <span className="text-[10px] text-white/50 leading-none mt-0.5">Pro Plan</span>
            </div>
          </div>
          <Button variant="default" className="bg-white text-black hover:bg-white/90 rounded-full font-bold">
            Enter Platform
          </Button>
        </div>
      </header>

      {/* Featured Article Hero (~70vh) */}
      <section className="h-[70vh] relative group cursor-pointer overflow-hidden border-b border-white/10 bg-zinc-900">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center group-hover:scale-105 transition-transform duration-700 mix-blend-overlay" />
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 md:p-16">
          <div className="max-w-4xl">
            <Badge className="bg-red-600 hover:bg-red-700 text-white rounded-sm mb-4 border-none uppercase tracking-wider text-xs font-bold px-2 py-1">Featured Interview</Badge>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight">The Future of Sound is Synthesized</h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-2xl font-serif">An exclusive conversation with the pioneers pushing the boundaries of algorithmic composition and audio engineering.</p>
          </div>
        </div>
      </section>

      {/* Broadsheet Row: SEVCO Feed (Left) + Sidebar (Right) */}
      <section className="px-6 py-12 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12 border-b border-white/10">
        {/* Left: SEVCO Feed (2/3) */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
            <h2 className="text-2xl font-bold uppercase tracking-widest">Latest from the Feed</h2>
            <Button variant="link" className="text-white/60 hover:text-white p-0">View All <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { category: "Music", time: "2 hours ago", title: "New Release: Midnight EP by The Synthetics", desc: "A deep dive into the creative process behind the most anticipated electronic album of the year." },
              { category: "Platform", time: "5 hours ago", title: "Introducing SEVCO Studio Beta", desc: "Our collaborative audio workspace is now available for all Pro creators." },
              { category: "Interview", time: "1 day ago", title: "In the Studio with Arca", desc: "We sit down to discuss experimental sound design and hardware." },
              { category: "Event", time: "2 days ago", title: "Community Showcase Results", desc: "Highlighting the top submissions from our latest beat battle." }
            ].map((item, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-[16/9] mb-4 overflow-hidden rounded-md bg-white/5 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="flex gap-2 items-center mb-2">
                  <Badge variant="outline" className="text-[10px] text-white/50 border-white/20">{item.category}</Badge>
                  <span className="text-[10px] text-white/40">{item.time}</span>
                </div>
                <h3 className="text-lg font-bold group-hover:text-red-500 transition-colors leading-snug">{item.title}</h3>
                <p className="text-sm text-white/60 mt-2 line-clamp-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Sidebar (1/3) */}
        <div className="space-y-12 flex flex-col">
          {/* Bulletin */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4 border-b border-white/10 pb-2">Bulletin</h2>
            <div className="space-y-4">
              {[
                { title: "Server maintenance scheduled for tonight at 2AM EST", type: "Alert" },
                { title: "New API endpoints available for developers", type: "Release" },
                { title: "Community townhall this Friday", type: "Event" }
              ].map((item, i) => (
                <div key={i} className="flex gap-3 group cursor-pointer">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium group-hover:text-red-400 transition-colors">{item.title}</h4>
                    <span className="text-xs text-white/40">{item.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What's New */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4 border-b border-white/10 pb-2">What's New</h2>
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 p-3 rounded-md flex gap-3">
                <div className="bg-blue-500/20 p-2 rounded shrink-0 h-fit">
                  <Zap className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Studio Mode Beta</h4>
                  <p className="text-xs text-white/60 mt-1">Try the new collaborative audio workspace.</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-3 rounded-md flex gap-3">
                <div className="bg-green-500/20 p-2 rounded shrink-0 h-fit">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Improved Analytics</h4>
                  <p className="text-xs text-white/60 mt-1">Deeper insights for creator accounts.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Wiki Latest */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4 border-b border-white/10 pb-2">Wiki Updates</h2>
            <div className="bg-zinc-900/50 p-4 rounded-lg border border-white/5">
              <div className="space-y-3">
                {[
                  "Audio Mastering Guide v2",
                  "Platform Guidelines 2026",
                  "Synthesizer Setup Tutorial"
                ].map((title, i) => (
                  <div key={i} className="flex items-center gap-2 group cursor-pointer">
                    <BookOpen className="w-3 h-3 text-white/40 group-hover:text-white" />
                    <span className="text-sm text-white/80 group-hover:text-white transition-colors">{title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wallpaper Band */}
      <section className="h-[40vh] relative flex items-center justify-center border-b border-white/10 bg-zinc-900">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-purple-900/30 z-10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2064&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-luminosity" />
        <div className="relative z-20 text-center">
          <h2 className="text-3xl md:text-5xl font-serif italic font-light tracking-wide mb-4">The Creative Ecosystem</h2>
          <Button variant="outline" className="border-white/20 hover:bg-white/10 text-white rounded-full">Explore the Universe</Button>
        </div>
      </section>

      {/* Platform Grid */}
      <section className="px-6 py-16 max-w-[1600px] mx-auto border-b border-white/10">
        <h2 className="text-2xl font-bold uppercase tracking-widest mb-8 text-center">Platform</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: "Wiki", icon: BookOpen, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-500/20" },
            { name: "Store", icon: ShoppingBag, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-500/20" },
            { name: "Music", icon: Music, color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-500/20" },
            { name: "Projects", icon: Folder, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-500/20" },
            { name: "Services", icon: Wrench, color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-500/20" },
            { name: "Community", icon: Users, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-500/20" },
          ].map((item, i) => (
            <div key={i} className={`bg-white/5 border ${item.border} p-6 rounded-xl flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors cursor-pointer`}>
              <div className={`w-12 h-12 rounded-full ${item.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <span className="font-bold tracking-wide">{item.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Charts Horizontal Rail */}
      <section className="px-6 py-12 max-w-[1600px] mx-auto border-b border-white/10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" /> Charts
          </h2>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4 snap-x no-scrollbar">
          {[
            { title: "Synthetic Dreams", artist: "Data Ghosts" },
            { title: "Neon Nights", artist: "The Midnight" },
            { title: "Analog Warmth", artist: "Circuit Board" },
            { title: "Digital Love", artist: "Vaporwave" },
            { title: "Quantum Leaps", artist: "Future Sound" },
            { title: "Binary Stars", artist: "The Algorithms" }
          ].map((item, i) => (
            <div key={i} className="min-w-[280px] md:min-w-[320px] bg-zinc-900/50 border border-white/10 p-4 rounded-xl flex items-center gap-4 snap-start group cursor-pointer hover:bg-white/5 transition-colors">
              <div className="w-16 h-16 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded relative overflow-hidden flex items-center justify-center font-bold text-xl shrink-0">
                {i + 1}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-6 h-6 text-white fill-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold line-clamp-1 group-hover:text-green-400 transition-colors">{item.title}</span>
                <span className="text-sm text-white/50">{item.artist}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="px-6 py-16 max-w-[1600px] mx-auto border-b border-white/10">
         <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
             Shop
          </h2>
          <Button variant="link" className="text-white/60 hover:text-white p-0">All Products <ArrowRight className="w-4 h-4 ml-1" /></Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           {[
             { name: "SEVCO Core Hoodie", price: "$65.00" },
             { name: "Platform T-Shirt", price: "$35.00" },
             { name: "Creator Cap", price: "$28.00" },
             { name: "Studio Mug", price: "$18.00" }
           ].map((item, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="aspect-square bg-zinc-900 border border-white/10 rounded-xl mb-4 overflow-hidden flex items-center justify-center p-8 relative hover:border-white/30 transition-colors">
                 <ShoppingBag className="w-12 h-12 text-white/10 group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="font-bold text-sm">{item.name}</h4>
              <p className="text-white/60 text-sm mt-1">{item.price}</p>
            </div>
           ))}
        </div>
      </section>

      {/* Bottom Pair: Community CTA + Sparks */}
      <section className="grid grid-cols-1 md:grid-cols-2 min-h-[400px]">
        <div className="bg-gradient-to-br from-blue-900/60 to-black border-r border-white/10 flex flex-col justify-center items-center p-12 text-center group cursor-pointer overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2070&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-screen group-hover:scale-105 transition-transform duration-700" />
          <Users className="w-12 h-12 text-blue-400 mb-6 relative z-10" />
          <h2 className="text-3xl font-bold mb-4 relative z-10">Join the Community</h2>
          <p className="text-white/70 max-w-md mb-8 relative z-10">Connect with creators, artists, and developers in the official SEVCO Discord server.</p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold px-8 relative z-10">Join Discord</Button>
        </div>
        <div className="bg-gradient-to-br from-amber-900/60 to-black flex flex-col justify-center items-center p-12 text-center group cursor-pointer overflow-hidden relative">
           <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=2070&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-screen group-hover:scale-105 transition-transform duration-700" />
          <Zap className="w-12 h-12 text-amber-400 mb-6 relative z-10 fill-amber-400/20" />
          <h2 className="text-3xl font-bold mb-4 relative z-10">Sparks Program</h2>
          <p className="text-white/70 max-w-md mb-8 relative z-10">Earn rewards for contributing to the ecosystem. Support creators and unlock exclusive perks.</p>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-full font-bold px-8 relative z-10">Learn More</Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 px-6 py-8 text-sm text-white/40 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
              <Zap className="w-2 h-2 text-white" />
            </div>
          <span>&copy; 2026 SEVCO. All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
}
