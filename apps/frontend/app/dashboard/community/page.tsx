'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { downloadFile } from '@/lib/export-utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } }
};

const COMMUNITY_STATS = [
  { label: 'Active Members', value: '10K+', icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { label: 'Discussions', value: '2.5K+', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Contributions', value: '5K+', icon: Code2, color: 'text-green-400', bg: 'bg-green-500/10' },
  { label: 'Resources', value: '500+', icon: BookOpen, color: 'text-orange-400', bg: 'bg-orange-500/10' },
];

const FEATURED_CONTRIBUTORS = [
  { id: 1, name: 'Amrita', role: 'Security Researcher', initials: 'AK', contributions: 248, templates: 42, badge: 'Expert', color: 'from-violet-600 to-violet-800' },
  { id: 2, name: 'Aditya', role: 'DevSecOps Engineer', initials: 'AR', contributions: 195, templates: 35, badge: 'Expert', color: 'from-blue-600 to-blue-800' },
  { id: 3, name: 'Taher', role: 'Pentester', initials: 'TM', contributions: 156, templates: 28, badge: 'Pro', color: 'from-teal-600 to-teal-800' },
  { id: 4, name: 'Achal', role: 'Cloud Security', initials: 'AP', contributions: 142, templates: 24, badge: 'Pro', color: 'from-emerald-600 to-emerald-800' },
];

const INITIAL_DISCUSSIONS = [
  { id: 1, title: 'Best practices for scanning Kubernetes clusters', author: 'Mike Johnson', replies: 24, likes: 156, category: 'Security', timestamp: '2h ago', pinned: true, isLiked: false },
  { id: 2, title: 'Creating custom templates for your infrastructure', author: 'Lisa Chen', replies: 18, likes: 92, category: 'Templates', timestamp: '5h ago', pinned: false, isLiked: false },
  { id: 3, title: 'Integrating SecureLens with CI/CD pipelines', author: 'David Brown', replies: 32, likes: 234, category: 'Integration', timestamp: '1d ago', pinned: false, isLiked: false },
  { id: 4, title: 'Zero trust architecture scanning strategies', author: 'Sarah Kim', replies: 15, likes: 78, category: 'Security', timestamp: '2d ago', pinned: false, isLiked: false },
];

const INITIAL_EVENTS = [
  { id: 1, title: 'Monthly Security Webinar', date: 'July 25, 2026', time: '3:00 PM UTC', attendees: 324, featured: true, speaker: 'Dr. Elena Vasquez', topic: 'Advanced Threat Modeling', rsvpd: false },
  { id: 2, title: 'Template Writing Workshop', date: 'August 1, 2026', time: '2:00 PM UTC', attendees: 156, featured: false, speaker: 'Raj Patel', topic: 'Custom Nuclei Templates', rsvpd: false },
  { id: 3, title: 'Community Q&A Session', date: 'August 8, 2026', time: '4:00 PM UTC', attendees: 89, featured: false, speaker: 'SecureLens Team', topic: 'Product Roadmap', rsvpd: false },
];

const POPULAR_RESOURCES = [
  {
    id: 1,
    title: 'OWASP Top 10 Scanning Guide',
    type: 'Guide',
    downloads: 2340,
    icon: BookOpen,
    filename: 'OWASP_Top_10_Scanning_Guide.md',
    content: `# OWASP Top 10 Security Scanning & Remediation Guide\n\n## 1. Broken Access Control\n- Enforce strict server-side authorization checks.\n- Disable direct object references.\n\n## 2. Cryptographic Failures\n- Enforce TLS 1.3 encryption across all public interfaces.\n- Avoid legacy cipher suites (RC4, DES).\n\n## 3. Injection Flaws\n- Always use parameterized queries / ORM mapping.\n- Implement strict context-aware output encoding.`,
  },
  {
    id: 2,
    title: 'Kubernetes Security Checklist',
    type: 'Checklist',
    downloads: 1890,
    icon: Code2,
    filename: 'Kubernetes_Security_Checklist.md',
    content: `# Kubernetes Hardening Checklist\n\n- [ ] Disable root containers (\`runAsNonRoot: true\`)\n- [ ] Enable Read-Only Root Filesystems\n- [ ] Configure Network Policies to restrict pod-to-pod traffic\n- [ ] Enforce RBAC least privilege permissions\n- [ ] Run daily automated vulnerability scans on container registries`,
  },
  {
    id: 3,
    title: 'CI/CD Security Pipeline Template',
    type: 'Template',
    downloads: 1560,
    icon: Zap,
    filename: 'SecureLens_CICD_Pipeline.yml',
    content: `name: SecureLens Automated AppSec Scan\non: [push, pull_request]\njobs:\n  security-scan:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Run SecureLens Scan Engine\n        run: curl -sSf https://api.securelens.io/v1/scan -H "Authorization: Bearer \${{ secrets.SECURELENS_API_KEY }}"`,
  },
  {
    id: 4,
    title: 'Cloud Security Assessment Kit',
    type: 'Kit',
    downloads: 1230,
    icon: Shield,
    filename: 'Cloud_Security_Assessment_Kit.md',
    content: `# Cloud Security Assessment Framework\n\n1. Identity & Access Management (IAM)\n2. Storage Bucket Public Access Blockers\n3. Ingress / Egress Security Groups\n4. CloudTrail and VPC Flow Logs Audit`,
  },
];

export default function CommunityPage() {
  const [selectedTab, setSelectedTab] = useState<'discussions' | 'events' | 'contributors' | 'resources'>('discussions');
  const [search, setSearch] = useState('');
  const [discussions, setDiscussions] = useState(INITIAL_DISCUSSIONS);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Post Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Security');
  const [newContent, setNewContent] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleLike = (id: number) => {
    setDiscussions(prev => prev.map(d => {
      if (d.id === id) {
        const isLiked = !d.isLiked;
        return { ...d, isLiked, likes: isLiked ? d.likes + 1 : d.likes - 1 };
      }
      return d;
    }));
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newPost = {
      id: Date.now(),
      title: newTitle.trim(),
      author: 'You (Security Engineer)',
      replies: 0,
      likes: 1,
      category: newCategory,
      timestamp: 'Just now',
      pinned: false,
      isLiked: true,
    };

    setDiscussions([newPost, ...discussions]);
    setNewTitle('');
    setNewContent('');
    setShowNewPostModal(false);
    showToast('Your discussion topic was posted to the Community!');
  };

  const handleRSVP = (eventId: number) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        const newRsvp = !ev.rsvpd;
        showToast(newRsvp ? `RSVP Confirmed for "${ev.title}"! Calendar invite sent.` : `RSVP cancelled for "${ev.title}".`);
        return { ...ev, rsvpd: newRsvp, attendees: newRsvp ? ev.attendees + 1 : ev.attendees - 1 };
      }
      return ev;
    }));
  };

  const handleDownloadResource = (res: typeof POPULAR_RESOURCES[0]) => {
    downloadFile(res.content, res.filename, 'text/markdown;charset=utf-8;');
    showToast(`Downloaded "${res.title}"`);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 px-4 py-3 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-violet-400/30 backdrop-blur-xl"
          >
            <Check size={14} /> {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Community</h1>
          <p className="text-sm text-gray-500 mt-0.5">Join thousands of security professionals sharing templates, insights, and best practices.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowNewPostModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
          >
            <Plus size={14} /> New Discussion
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.open('https://discord.gg', '_blank')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 text-xs font-medium transition-all cursor-pointer"
          >
            <ExternalLink size={13} /> Join Discord
          </motion.button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {COMMUNITY_STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} whileHover={{ y: -1 }} className={`${stat.bg} border border-white/[0.04] rounded-xl p-4 transition-all`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} className={stat.color} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-wrap gap-1 bg-white/[0.02] rounded-xl p-1 border border-white/[0.06]">
        {(['discussions', 'events', 'contributors', 'resources'] as const).map(tab => (
          <button key={tab} onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize cursor-pointer ${
              selectedTab === tab ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {tab}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {selectedTab === 'discussions' && (
          <motion.div key="discussions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative max-w-sm flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search discussions & threads..."
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
              </div>
            </div>

            {discussions.filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase())).map((discussion) => (
              <motion.div key={discussion.id} variants={itemVariants}
                className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 hover:bg-white/[0.03] hover:border-white/[0.08] transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {discussion.pinned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">Pinned</span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-gray-500 border border-white/[0.06]">{discussion.category}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">{discussion.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                      <span>by {discussion.author}</span>
                      <span className="text-gray-700">·</span>
                      <span>{discussion.timestamp}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><MessageSquare size={12} />{discussion.replies}</span>
                    <button
                      onClick={() => handleToggleLike(discussion.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                        discussion.isLiked
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-white/[0.02] text-gray-400 border-white/[0.04] hover:text-white'
                      }`}
                    >
                      <Heart size={12} className={discussion.isLiked ? 'fill-current' : ''} />
                      {discussion.likes}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {selectedTab === 'events' && (
          <motion.div key="events" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            {events.map((event) => (
              <motion.div key={event.id} variants={itemVariants}
                className={`rounded-xl p-5 transition-all group ${
                  event.featured
                    ? 'bg-gradient-to-r from-violet-600/10 via-violet-600/5 to-transparent border border-violet-500/20 hover:border-violet-500/40'
                    : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]'
                }`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 mb-1">
                      {event.featured && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
                          <Zap size={10} /> Featured Event
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">{event.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{event.speaker} — <strong className="text-gray-300">{event.topic}</strong></p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><Calendar size={12} className="text-violet-400" />{event.date}</span>
                      <span className="flex items-center gap-1.5"><Clock size={12} className="text-violet-400" />{event.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-xl font-bold text-violet-400">{event.attendees}</p>
                      <p className="text-[11px] text-gray-500">attending</p>
                    </div>
                    <button
                      onClick={() => handleRSVP(event.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        event.rsvpd
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-violet-600 hover:bg-violet-500 text-white shadow-md'
                      }`}
                    >
                      {event.rsvpd ? '✓ RSVP\'d' : 'RSVP Now'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {selectedTab === 'contributors' && (
          <motion.div key="contributors" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURED_CONTRIBUTORS.map((contributor) => (
              <motion.div key={contributor.id} variants={itemVariants} whileHover={{ y: -2 }}
                className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 hover:border-white/[0.08] transition-all group">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${contributor.color} flex items-center justify-center text-white text-sm font-bold shadow-lg shrink-0`}>
                    {contributor.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white">{contributor.name}</h3>
                    <p className="text-xs text-gray-500">{contributor.role}</p>
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/20">
                      <Award size={10} /> {contributor.badge}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">{contributor.contributions}</p>
                    <p className="text-[10px] text-gray-500">Contributions</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">{contributor.templates}</p>
                    <p className="text-[10px] text-gray-500">Templates</p>
                  </div>
                </div>
                <button
                  onClick={() => showToast(`Viewing profile for ${contributor.name}`)}
                  className="w-full py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all font-medium cursor-pointer"
                >
                  View Contributions
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}

        {selectedTab === 'resources' && (
          <motion.div key="resources" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            {POPULAR_RESOURCES.map((resource) => {
              const Icon = resource.icon;
              return (
                <motion.div key={resource.id} variants={itemVariants}
                  className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 hover:bg-white/[0.03] hover:border-white/[0.08] transition-all group flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-violet-600/10 border border-violet-500/20 shrink-0">
                      <Icon size={18} className="text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors truncate">{resource.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-[11px] text-gray-400 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.06]">{resource.type}</span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1"><TrendingUp size={10} />{resource.downloads.toLocaleString()} downloads</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadResource(resource)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/30 text-xs font-semibold transition-all cursor-pointer shrink-0"
                  >
                    <Download size={13} /> Download
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Discussion Modal */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0b0f19] border border-white/[0.08] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-white">Start New Community Discussion</h3>
              <button onClick={() => setShowNewPostModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Topic Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scanning Next.js 16 applications with custom templates..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="Security">Security</option>
                  <option value="Templates">Templates</option>
                  <option value="Integration">Integration</option>
                  <option value="Best Practices">Best Practices</option>
                  <option value="Threat Intelligence">Threat Intelligence</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Content / Question</label>
                <textarea
                  rows={4}
                  placeholder="Share details, context, code snippets, or scan results..."
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-gray-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs text-white font-semibold shadow-lg shadow-violet-600/20 cursor-pointer"
                >
                  Post Topic
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600/10 via-violet-600/5 to-transparent border border-violet-500/20 p-6 text-center group hover:border-violet-500/40 transition-all">
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h2 className="text-lg font-bold text-white mb-1">Ready to Contribute?</h2>
          <p className="text-sm text-gray-400 mb-4">Share templates, write guides, and help the community grow.</p>
          <button
            onClick={() => setShowNewPostModal(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-600/20 cursor-pointer"
          >
            Create Community Topic
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
