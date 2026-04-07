import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { useDebounce } from "@/hooks/use-debounce";

type DiscoverUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followerCount: number;
  isFollowing: boolean;
};

function UserCard({ user, currentUserId }: { user: DiscoverUser; currentUserId?: string }) {
  const { toast } = useToast();
  const isSelf = currentUserId === user.id;

  const followMutation = useMutation({
    mutationFn: () =>
      user.isFollowing
        ? apiRequest("DELETE", `/api/users/${user.username}/follow`)
        : apiRequest("POST", `/api/users/${user.username}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/top"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/search"] });
    },
    onError: () => toast({ title: "Failed to update follow", variant: "destructive" }),
  });

  const initials = (user.displayName || user.username).slice(0, 2).toUpperCase();

  return (
    <Card className="p-4 flex items-center gap-3" data-testid={`card-discover-user-${user.id}`}>
      <Link href={`/profile/${user.username}`}>
        <Avatar className="h-12 w-12 shrink-0 cursor-pointer">
          {user.avatarUrl && <AvatarImage src={resolveImageUrl(user.avatarUrl)} />}
          <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.username}`}>
          <p className="text-sm font-semibold truncate hover:underline cursor-pointer" data-testid={`text-discover-name-${user.id}`}>
            {user.displayName || user.username}
          </p>
        </Link>
        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
        <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-discover-followers-${user.id}`}>
          {user.followerCount} {user.followerCount === 1 ? "follower" : "followers"}
        </p>
      </div>
      {currentUserId && !isSelf && (
        <Button
          variant={user.isFollowing ? "outline" : "default"}
          size="sm"
          onClick={() => followMutation.mutate()}
          disabled={followMutation.isPending}
          className="shrink-0"
          data-testid={`button-discover-follow-${user.id}`}
        >
          {user.isFollowing ? (
            <><UserCheck className="h-3.5 w-3.5 mr-1" /> Following</>
          ) : (
            <><UserPlus className="h-3.5 w-3.5 mr-1" /> Follow</>
          )}
        </Button>
      )}
    </Card>
  );
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: topUsers, isLoading: topLoading } = useQuery<DiscoverUser[]>({
    queryKey: ["/api/users/top"],
    staleTime: 60 * 1000,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery<DiscoverUser[]>({
    queryKey: ["/api/users/search", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const isSearching = debouncedQuery.trim().length > 0;
  const displayUsers = isSearching ? (searchResults ?? []) : (topUsers ?? []);
  const isLoading = isSearching ? searchLoading : topLoading;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-xl font-bold mb-1">Discover People</h1>
          <p className="text-sm text-muted-foreground">Find people to follow on SEVCO Social.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-discover-search"
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {isSearching ? "Search Results" : "Top Followed"}
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4 flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </Card>
              ))}
            </div>
          ) : displayUsers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {isSearching ? "No users found matching your search." : "No users to show yet."}
            </div>
          ) : (
            <div className="space-y-3">
              {displayUsers.map((u) => (
                <UserCard key={u.id} user={u} currentUserId={user?.id} />
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
