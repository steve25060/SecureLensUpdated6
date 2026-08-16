'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageSquare,
  Code2,
  BookOpen,
  Award,
  Zap,
  Heart,
  Calendar,
  MapPin,
  ExternalLink,
  Search,
  ArrowRight,
  Star,
  TrendingUp,
  Shield,
  Clock,
  Plus,
  X,
  Check,
  Download,
  Share2,
  Loader2,
  Activity,
  Sparkles,
  Eye,
  MessageCircle,
  GitBranch,
} from 'lucide-react';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } }
};

interface CommunityActivity {
  id: string;
  type: 'contribution' | 'template' | 'discussion' | 'resource' | 'event';
  author: string;
  title: string;
  description: string;
  avatar?: string;
  likes?: number;
  replies?: number;
  timestamp: number;
  link?: string;
  tags?: string[];
  severity?: string;
}

const COMMUNITY_STATS = [
  { label: 'Active Members', value: '10K+', icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { label: 'Discussions', value: '2.5K+', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Contributions', value: '5K+', icon: Code2, color: 'text-green-400', bg: 'bg-green-500/10' },
  { label: 'Resources', value: '500+', icon: BookOpen, color: 'text-orange-400', bg: 'bg-orange-500/10' },
];

const FEATURED_CONTRIBUTORS = [
  {
    id: 1,
    name: 'Amrita',
    role: 'Security Researcher',
    initials: 'AK',
    contributions: 248,
    templates: 42,
    badge: 'Expert',
    color: 'from-violet-600 to-violet-800'
  },
  {
    id: 2,
    name: 'Aditya',
    role: 'DevSecOps Engineer',
    initials: 'AR',
    contributions: 195,
    templates: 35,
    badge: 'Expert',
    color: 'from-blue-600 to-blue-800'
  },
  {
    id: 3,
    name: 'Taher',
    role: 'Pentester',
    initials: 'TM',
    contributions: 156,
    templates: 28,
    badge: 'Pro',
    color: 'from-teal-600 to-teal-800'
  },
  {
    id: 4,
    name: 'Achal',
    role: 'Cloud Security',
    initials: 'AP',
    contributions: 142,
    templates: 24,
    badge: 'Pro',
    color: 'from-emerald-600 to-emerald-800'
  },
];

interface Discussion {
  id: number;
  title: string;
  author: string;
  replies: number;
  likes: number;
  category: string;
  timestamp: string;
}

const SEED_DISCUSSIONS: Discussion[] = [
  { id: 1, title: 'Best practices for container security scanning', author: 'Alex Chen', replies: 23, likes: 145, category: 'DevSecOps', timestamp: '2h ago' },
  { id: 2, title: 'Custom nuclei templates for AWS security', author: 'Sam Rodriguez', replies: 18, likes: 98, category: 'AWS', timestamp: '4h ago' },
  { id: 3, title: 'Zero-trust architecture implementation guide', author: 'Jordan Lee', replies: 31, likes: 212, category: 'Architecture', timestamp: '1d ago' },
  { id: 4, title: 'API security testing methodologies', author: 'Casey Williams', replies: 15, likes: 87, category: 'API Security', timestamp: '2d ago' },
];

export default function CommunityPage() {
  // Real-time synchronization - listen to ALL events
  const { isLive, eventCount, lastEventType, lastEventData } = useRealtimeSync('*');

  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>(SEED_DISCUSSIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'contribution' | 'template' | 'discussion' | 'resource'>('all');
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [realtimeIndicator, setRealtimeIndicator] = useState(false);

  // Add real-time activity when events occur
  useEffect(() => {
    if (lastEventType && lastEventData) {
      const newActivity = generateActivityFromEvent(lastEventType, lastEventData);
      if (newActivity) {
        setActivities(prev => [newActivity, ...prev.slice(0, 49)]); // Keep last 50
        setRealtimeIndicator(true);
        setTimeout(() => setRealtimeIndicator(false), 1000);
      }
    }
  }, [lastEventType, lastEventData]);

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const matchesCategory = selectedCategory === 'all' || a.type === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activities, selectedCategory, searchQuery]);

  const loadMoreActivities = useCallback(async () => {
    setIsLoadingFeed(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newActivities: CommunityActivity[] = [
        {
          id: `activity-${Date.now()}`,
          type: 'template',
          author: 'Security Team',
          title: 'New Azure Security Best Practices Template',
          description: 'Comprehensive template for scanning Azure resources for misconfigurations and compliance issues.',
          likes: 42,
          timestamp: Date.now(),
          tags: ['azure', 'cloud', 'compliance'],
          severity: 'high'
        },
        {
          id: `activity-${Date.now() + 1}`,
          type: 'discussion',
          author: 'DevSecOps Community',
          title: 'CI/CD Pipeline Security - Share Your Experiences',
          description: 'Let\'s discuss secure CI/CD practices and share best practices from real-world implementations.',
          replies: 12,
          timestamp: Date.now(),
          tags: ['ci-cd', 'devops', 'security']
        },
        {
          id: `activity-${Date.now() + 2}`,
          type: 'contribution',
          author: 'Open Source Contributors',
          title: 'WordPress Security Vulnerability Scanner',
          description: 'New open-source tool for identifying common WordPress security issues and misconfigurations.',
          likes: 89,
          timestamp: Date.now(),
          tags: ['wordpress', 'scanner', 'open-source']
        }
      ];

      setActivities(prev => [...prev, ...newActivities]);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  const getActivityIcon = (type: CommunityActivity['type']) => {
    switch (type) {
      case 'contribution': return Code2;
      case 'template': return BookOpen;
      case 'discussion': return MessageSquare;
      case 'resource': return Award;
      case 'event': return Calendar;
      default: return Star;
    }
  };

  const getActivityColor = (type: CommunityActivity['type']) => {
    switch (type) {
      case 'contribution': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'template': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'discussion': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'resource': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'event': return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header with Real-time Status */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-pink-600 to-pink-800 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Community</h1>
                <p className="text-sm text-slate-400">Real-time security community hub</p>
              </div>
            </div>

            {/* Real-time Status */}
            <div className="flex items-center gap-3">
              <motion.div
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg border border-slate-700"
                animate={{ scale: isLive ? 1 : 0.95 }}
              >
                <Activity className={`w-4 h-4 ${isLive ? 'text-green-400 animate-pulse' : 'text-red-400'}`} />
                <span className="text-sm text-slate-300">{isLive ? 'Live Feed' : 'Offline'}</span>
              </motion.div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search discussions, templates, contributions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>
      </div>

      {/* Community Stats */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={containerVariants}
        >
          {COMMUNITY_STATS.map((stat, i) => (
            <motion.div
              key={i}
              className={`p-4 rounded-lg border border-slate-700 ${stat.bg}`}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Featured Contributors */}
        <motion.div className="mb-8" variants={itemVariants}>
          <h2 className="text-xl font-bold text-white mb-4">Featured Contributors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURED_CONTRIBUTORS.map((contributor) => (
              <motion.div
                key={contributor.id}
                className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-violet-500/50 transition-all"
                whileHover={{ y: -4 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${contributor.color} flex items-center justify-center font-bold text-white`}>
                    {contributor.initials}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{contributor.name}</h3>
                    <p className="text-xs text-slate-400">{contributor.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="px-2 py-1 bg-violet-500/10 border border-violet-500/20 rounded text-violet-400 font-medium">
                    {contributor.badge}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-700/50 rounded">
                    <p className="text-slate-400">Contributions</p>
                    <p className="font-bold text-white">{contributor.contributions}</p>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <p className="text-slate-400">Templates</p>
                    <p className="font-bold text-white">{contributor.templates}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Real-time Activity Feed */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Real-Time Activity Feed</h2>
            <div className="flex gap-2">
              {(['all', 'contribution', 'template', 'discussion', 'resource'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {filteredActivities.length > 0 ? (
              <motion.div className="space-y-3" variants={containerVariants}>
                {filteredActivities.map((activity, i) => {
                  const ActivityIcon = getActivityIcon(activity.type);
                  return (
                    <motion.div
                      key={activity.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`p-4 rounded-lg border transition-all group hover:shadow-lg cursor-pointer ${
                        i === 0 && isLive
                          ? 'bg-slate-700/60 border-violet-500/40 shadow-lg'
                          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg flex-shrink-0 border ${getActivityColor(activity.type)}`}>
                          <ActivityIcon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-semibold text-white group-hover:text-violet-400 transition-colors">
                                {activity.title}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">{activity.author}</p>
                            </div>
                            {i === 0 && realtimeIndicator && (
                              <motion.div
                                className="px-2 py-1 bg-green-500/20 border border-green-500/40 rounded text-xs font-medium text-green-400"
                                animate={{ scale: [1, 1.05, 1] }}
                              >
                                New
                              </motion.div>
                            )}
                          </div>

                          <p className="text-sm text-slate-300 line-clamp-2">{activity.description}</p>

                          {/* Tags */}
                          {activity.tags && activity.tags.length > 0 && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {activity.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Stats */}
                          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(activity.timestamp)}
                            </span>
                            {activity.likes !== undefined && (
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {activity.likes}
                              </span>
                            )}
                            {activity.replies !== undefined && (
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {activity.replies}
                              </span>
                            )}
                          </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-violet-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1" />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div className="text-center py-12" variants={itemVariants}>
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No activities found. Check back soon!</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Load More Button */}
          <motion.button
            onClick={loadMoreActivities}
            disabled={isLoadingFeed}
            className="w-full mt-6 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors border border-slate-700 font-medium text-white flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            {isLoadingFeed ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Load More Activities
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Helper functions
function generateActivityFromEvent(eventType: string, data: any): CommunityActivity | null {
  const timestamp = Date.now();

  if (eventType === 'FINDING_ADDED') {
    return {
      id: `finding-${timestamp}`,
      type: 'resource',
      author: 'Security Scanner',
      title: `🔍 New Finding: ${data.title}`,
      description: `${data.severity || 'Unknown'} severity finding detected. ${data.message || ''}`,
      likes: 0,
      timestamp,
      tags: [data.severity?.toLowerCase() || 'finding', 'security'],
      severity: data.severity
    };
  }

  if (eventType === 'SCAN_COMPLETED') {
    return {
      id: `scan-${timestamp}`,
      type: 'template',
      author: 'Live Scanner',
      title: `✅ Scan Completed: ${data.target || 'Target'}`,
      description: `Scan finished with ${data.findingCount || 0} findings. Ready for analysis.`,
      likes: 1,
      timestamp,
      tags: ['scan', 'completed']
    };
  }

  if (eventType === 'SCAN_STARTED') {
    return {
      id: `scan-start-${timestamp}`,
      type: 'contribution',
      author: 'Live Scanner',
      title: `🚀 Scan Started: ${data.target || 'New Target'}`,
      description: `Security scan initiated for target analysis.`,
      likes: 0,
      timestamp,
      tags: ['scan', 'active']
    };
  }

  if (eventType === 'USER_ACTIVITY') {
    return {
      id: `activity-${timestamp}`,
      type: 'discussion',
      author: data.user || 'Community Member',
      title: data.title || 'New Activity',
      description: data.message || 'Check out what the community is doing!',
      replies: 0,
      timestamp,
      tags: ['community', 'activity']
    };
  }

  return null;
}

function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
