import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, ShoppingBag, Music, Folder, Briefcase, 
  Users, Zap, ChevronRight, Play, Star, Sparkles,
  ArrowRight, Heart
} from "lucide-react";

const PLATFORM_SECTIONS = [
  { label: "Wiki", path: "/wiki", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "Store", path: "/store", icon: ShoppingBag, color: "text-red-700", bg: "bg-red-700/10" },
  { label: "Music", path: "/music", icon: Music, color: "text-blue-600", bg: "bg-blue-600/10" },
  { label: "Projects", path: "/projects", icon: Folder, color: "text-green-500", bg: "bg-green-500/10" },
  { label: "Services", path: "/services", icon: Briefcase, color: "text-sky-500", bg: "bg-sky-500/10" },
  { label: "Community", path: "/contact", icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10" },
];

const BULLETINS = [
  "New SEVCO Studio tools rolling out to Pro users this week.",
  "System maintenance scheduled for Friday 2AM EST.",
  "Community town hall: Join us on Discord tomorrow."
];

const WIKI_LATEST = [
  { title: "Brand Guidelines v2.1", date: "2h ago" },
  { title: "Engineering Onboarding", date: "5h ago" },
  { title: "Product Roadmap Q3", date: "1d ago" }
];

const FEED_POSTS = [
  { type: "article", title: "The Future of Digital Distribution", excerpt: "How we're rethinking the way artists release music independently.", tag: "Editorial" },
  { type: "update", title: "SEVCO Records: Summer Roster", excerpt: "Announcing the 5 new artists joining our incubator program.", tag: "Music" },
  { type: "changelog", title: "Platform Update v1.4", excerpt: "New messaging system, improved load times, and mobile fixes.", tag: "Product" },
  { type: "article", title: "Designing for the Next Generation", excerpt: "A look inside the creative process for our new brand identity.", tag: "Design" },
  { type: "changelog", title: "Creator Dashboard Beta", excerpt: "Early access is now open for top contributors.", tag: "Features" }
];

export function AsymmetricTwoPane() {
  return (
    <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* LEFT PANE - STICKY NAVIGATION */}
      <div className="w-[340px] shrink-0 border-r border-white/10 bg-black flex flex-col h-full">
        <ScrollArea className="flex-1">
          <div className="p-6 flex flex-col gap-8">
            
            {/* Brand Mark */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-black" />
              </div>
              <span className="text-xl font-extrabold tracking-tight">SEVCO</span>
            </div>

            {/* User Snapshot */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <Avatar className="h-12 w-12 ring-2 ring-white/10">
                <AvatarFallback className="bg-zinc-800">JD</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Jane Doe</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 h-4 border-0">PRO</Badge>
                  <span className="text-xs text-white/40 hover:text-white/80 cursor-pointer transition-colors">Settings</span>
                </div>
              </div>
            </div>

            {/* Condensed Platform Grid */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 px-1">Platform</h3>
              {PLATFORM_SECTIONS.map((section, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer group">
                  <div className={`h-8 w-8 rounded-md flex items-center justify-center ${section.bg}`}>
                    <section.icon className={`h-4 w-4 ${section.color}`} />
                  </div>
                  <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{section.label}</span>
                </div>
              ))}
            </div>

            {/* Bulletin */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider px-1">Bulletin</h3>
              <div className="flex flex-col gap-3">
                {BULLETINS.map((text, i) => (
                  <div key={i} className="flex items-start gap-2 px-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <p className="text-xs text-white/60 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </ScrollArea>
        
        {/* Wiki Latest (Bottom Sticky) */}
        <div className="p-6 border-t border-white/5 bg-black/50 backdrop-blur-md">
           <div className="flex items-center gap-2 mb-4">
             <BookOpen className="h-4 w-4 text-white/40" />
             <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">Latest Docs</h3>
           </div>
           <div className="flex flex-col gap-3">
             {WIKI_LATEST.map((doc, i) => (
               <div key={i} className="flex justify-between items-center group cursor-pointer">
                 <span className="text-xs text-white/70 group-hover:text-white transition-colors truncate pr-4">{doc.title}</span>
                 <span className="text-[10px] text-white/30 shrink-0">{doc.date}</span>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* RIGHT PANE - SCROLLING CONTENT STREAM */}
      <div className="flex-1 h-full overflow-y-auto bg-zinc-950 relative">
        <div className="max-w-5xl mx-auto p-8 lg:p-12 flex flex-col gap-12">
          
          {/* Compact Hero / Welcome */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-8 md:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />
            <div className="relative z-10 max-w-2xl">
              <Badge className="bg-white/10 text-white hover:bg-white/20 mb-6 border-0">Welcome to SEVCO</Badge>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">The Inspiration Company.</h1>
              <p className="text-lg text-white/60 mb-8 max-w-xl">
                A creative platform for artists, builders, and dreamers. Enter the universe.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-white text-black hover:bg-white/90 font-semibold px-8">
                  Enter the Platform
                </Button>
                <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/5 bg-transparent">
                  Explore the Wiki
                </Button>
              </div>
            </div>
          </div>

          {/* Featured Article */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight px-1">Featured Reading</h2>
            <div className="group relative rounded-2xl border border-white/10 overflow-hidden cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
              <div className="absolute inset-0 bg-zinc-800" /> {/* Placeholder image bg */}
              <div className="relative z-20 p-8 pt-48 md:pt-64 flex flex-col justify-end h-full">
                <Badge className="w-fit mb-4 bg-blue-500 text-white border-0">Exclusive</Badge>
                <h3 className="text-3xl font-bold mb-2 group-hover:text-blue-400 transition-colors">The Next Evolution of Digital Sound</h3>
                <p className="text-white/70 max-w-2xl">An in-depth look at how independent creators are leveraging new tools to bypass traditional gatekeepers and reach audiences directly.</p>
              </div>
            </div>
          </div>

          {/* 2-Column Masonry: Feed & Updates */}
          <div className="flex flex-col gap-4">
             <h2 className="text-xl font-bold tracking-tight px-1">The Stream</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
               {/* Left Column */}
               <div className="flex flex-col gap-6">
                 {FEED_POSTS.filter((_, i) => i % 2 === 0).map((post, i) => (
                   <Card key={i} className="bg-white/[0.02] border-white/5 hover:border-white/15 transition-colors rounded-xl overflow-hidden">
                     <CardContent className="p-6">
                       <div className="flex items-center justify-between mb-4">
                         <Badge variant="outline" className="text-[10px] uppercase border-white/10 text-white/50">{post.tag}</Badge>
                         {post.type === "changelog" ? <Zap className="h-4 w-4 text-yellow-500/70" /> : <BookOpen className="h-4 w-4 text-white/30" />}
                       </div>
                       <h3 className="text-lg font-bold mb-2 text-white">{post.title}</h3>
                       <p className="text-sm text-white/50 leading-relaxed">{post.excerpt}</p>
                     </CardContent>
                   </Card>
                 ))}
               </div>
               
               {/* Right Column */}
               <div className="flex flex-col gap-6 mt-4 md:mt-12">
                 {FEED_POSTS.filter((_, i) => i % 2 !== 0).map((post, i) => (
                   <Card key={i} className="bg-white/[0.02] border-white/5 hover:border-white/15 transition-colors rounded-xl overflow-hidden">
                     <CardContent className="p-6">
                       <div className="flex items-center justify-between mb-4">
                         <Badge variant="outline" className="text-[10px] uppercase border-white/10 text-white/50">{post.tag}</Badge>
                         {post.type === "changelog" ? <Zap className="h-4 w-4 text-yellow-500/70" /> : <BookOpen className="h-4 w-4 text-white/30" />}
                       </div>
                       <h3 className="text-lg font-bold mb-2 text-white">{post.title}</h3>
                       <p className="text-sm text-white/50 leading-relaxed">{post.excerpt}</p>
                     </CardContent>
                   </Card>
                 ))}
               </div>
             </div>
          </div>

          {/* Charts Carousel */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Music className="h-5 w-5 text-blue-500" />
                Top Charts
              </h2>
              <Button variant="ghost" size="sm" className="text-white/50 hover:text-white h-8 text-xs">View All <ArrowRight className="ml-1 h-3 w-3" /></Button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="shrink-0 w-[240px] snap-start group cursor-pointer">
                  <div className="aspect-square bg-zinc-800 rounded-xl mb-3 relative overflow-hidden flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-colors">
                    <Music className="h-8 w-8 text-white/10" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="h-5 w-5 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                  <h4 className="font-bold text-sm truncate">Track Title {i}</h4>
                  <p className="text-xs text-white/50 truncate">Artist Name</p>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Products */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-red-500" />
                Featured Gear
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="aspect-[4/3] bg-zinc-900 rounded-2xl mb-4 border border-white/5 overflow-hidden relative flex items-center justify-center">
                    <ShoppingBag className="h-12 w-12 text-white/5" />
                    <Badge className="absolute top-4 left-4 bg-white/10 backdrop-blur-md border-0 text-white">New Arrival</Badge>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg mb-1">SEVCO Core Hoodie</h4>
                      <p className="text-sm text-white/50">Heavyweight Cotton</p>
                    </div>
                    <span className="font-medium">$85.00</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wallpaper Full-Bleed */}
          <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center bg-zinc-900 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-purple-900/20" />
            <div className="relative z-10 flex flex-col items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 duration-300">
              <Button variant="secondary" className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20">
                Download Wallpaper
              </Button>
            </div>
          </div>

          {/* Community & Sparks Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-blue-900/40 via-blue-950/20 to-black border-blue-500/20">
              <CardContent className="p-8 md:p-10 flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Join the Community</h3>
                <p className="text-blue-100/60 mb-8 max-w-sm">Connect with thousands of creators, artists, and builders on Discord.</p>
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0">Launch Discord</Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-900/40 via-amber-950/20 to-black border-amber-500/20">
              <CardContent className="p-8 md:p-10 flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6">
                  <Sparkles className="h-8 w-8 text-amber-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Earn Sparks</h3>
                <p className="text-amber-100/60 mb-8 max-w-sm">Contribute to the platform and earn Sparks for exclusive rewards.</p>
                <Button className="w-full bg-amber-600 hover:bg-amber-500 text-white border-0">View Leaderboard</Button>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="pt-12 pb-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
            <div className="flex items-center gap-6">
              <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
              <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
              <span className="hover:text-white transition-colors cursor-pointer">Contact</span>
            </div>
            <span>© {new Date().getFullYear()} SEVCO. All rights reserved.</span>
          </div>

        </div>
      </div>
      
    </div>
  );
}
