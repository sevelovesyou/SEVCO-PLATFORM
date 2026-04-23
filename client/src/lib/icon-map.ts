import {
  Activity, AlertCircle, AlertTriangle, AlignLeft, Archive, ArrowDown, ArrowLeft,
  ArrowRight, ArrowUp, ArrowUpDown, AtSign, Award,
  BarChart, BarChart2, BarChart3, Bell, BellOff, Bold, Bookmark, BookmarkCheck,
  BookOpen, Bot, Boxes, Briefcase, Building, Building2,
  Calendar, Camera, Check, CheckCheck, CheckCircle, CheckCircle2, CheckSquare,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, CircleCheck, CircleX,
  Clock, Code, Code2, Coins, Compass, Copy, CreditCard, Crown, Cpu,
  Database, Disc, Download, Drum,
  Edit, Edit2, Edit3, ExternalLink, Eye, EyeOff,
  FileText, Filter, Flag, Flame, Folder, FolderOpen,
  Gamepad2, Gift, Globe, Grid, Grid3X3,
  Hash, Headphones, Heart, HelpCircle, Home,
  Image, Info, Italic,
  Key, Keyboard,
  Layers, Layout, Library, Link, List, ListMusic, Lock, LogIn, LogOut,
  Mail, Map, MapPin, Maximize, Menu, MessageCircle, MessageSquare, Mic, Minus,
  Monitor, Moon, MoreHorizontal, MoreVertical, Music, Music2,
  Navigation, Network, Newspaper,
  Package, Paperclip, Pause, Pen, Pencil, Phone, Play, Plus, Printer,
  Radio, RefreshCw, Rocket, Rss,
  Save, Search, Send, Server, Settings, Share, Share2, Shield, ShieldCheck,
  ShoppingBag, ShoppingCart, Sidebar, SkipBack, SkipForward, Sliders, Star,
  Sun, Sunrise,
  Table, Tag, Terminal, ThumbsUp, Ticket, Timer, Trash, Trash2, Trophy, Tv,
  Underline, Unlock, Upload, User, Users, UserCheck,
  Video, Verified, Volume, Volume2, VolumeX,
  Wallet, Wand2, Wifi, X, XCircle,
  Zap, ZoomIn, ZoomOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Activity, AlertCircle, AlertTriangle, AlignLeft, Archive, ArrowDown, ArrowLeft,
  ArrowRight, ArrowUp, ArrowUpDown, AtSign, Award,
  BarChart, BarChart2, BarChart3, Bell, BellOff, Bold, Bookmark, BookmarkCheck,
  BookOpen, Bot, Boxes, Briefcase, Building, Building2,
  Calendar, Camera, Check, CheckCheck, CheckCircle, CheckCircle2, CheckSquare,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, CircleCheck, CircleX,
  Clock, Code, Code2, Coins, Compass, Copy, CreditCard, Crown, Cpu,
  Database, Disc, Download, Drum,
  Edit, Edit2, Edit3, ExternalLink, Eye, EyeOff,
  FileText, Filter, Flag, Flame, Folder, FolderOpen,
  Gamepad2, Gift, Globe, Grid, Grid3X3,
  Hash, Headphones, Heart, HelpCircle, Home,
  Image, Info, Italic,
  Key, Keyboard,
  Layers, Layout, Library, Link, List, ListMusic, Lock, LogIn, LogOut,
  Mail, Map, MapPin, Maximize, Menu, MessageCircle, MessageSquare, Mic, Minus,
  Monitor, Moon, MoreHorizontal, MoreVertical, Music, Music2,
  Navigation, Network, Newspaper,
  Package, Paperclip, Pause, Pen, Pencil, Phone, Play, Plus, Printer,
  Radio, RefreshCw, Rocket, Rss,
  Save, Search, Send, Server, Settings, Share, Share2, Shield, ShieldCheck,
  ShoppingBag, ShoppingCart, Sidebar, SkipBack, SkipForward, Sliders, Star,
  Sun, Sunrise,
  Table, Tag, Terminal, ThumbsUp, Ticket, Timer, Trash, Trash2, Trophy, Tv,
  Underline, Unlock, Upload, User, Users, UserCheck,
  Video, Verified, Volume, Volume2, VolumeX,
  Wallet, Wand2, Wifi, X, XCircle,
  Zap, ZoomIn, ZoomOut,
};

export function getIcon(name: string | undefined): LucideIcon | null {
  if (!name) return null;
  const direct = ICON_MAP[name];
  if (direct) return direct;
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return ICON_MAP[capitalized] ?? null;
}
