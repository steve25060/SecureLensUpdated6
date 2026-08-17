"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, X, Plus, Shield, Check, ExternalLink, ArrowRight,
  User, Mail, Building, Key, Sparkles, CheckCircle2, Lock
} from "lucide-react";

type Props = {
  mode?: "login" | "register";
  onGitHub?: () => void;
  onGoogle?: () => void;
};

interface GoogleAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

const DEFAULT_GOOGLE_ACCOUNTS: GoogleAccount[] = [
  {
    id: "g_1",
    name: "Stavan CyberSec",
    email: "stavan.cybersec@gmail.com",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
  },
  {
    id: "g_2",
    name: "Alex Vance (SecOps)",
    email: "alex.vance@securitylead.io",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80",
  },
];

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z"
      />
    </svg>
  );
}

function GitHubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export default function SocialLoginButtons({ mode = "login", onGitHub, onGoogle }: Props) {
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);

  // Google Modal State
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [isAddingGoogleAccount, setIsAddingGoogleAccount] = useState(false);

  // GitHub Modal State
  const [githubUsername, setGithubUsername] = useState("steve25060");
  const [githubEmail, setGithubEmail] = useState("steve@github.com");
  const [githubOrg, setGithubOrg] = useState("SecureLens-Team");

  const [loadingAction, setLoadingAction] = useState(false);
  const router = useRouter();

  const handleOAuthSuccess = (userData: {
    userId: string;
    email: string;
    name: string;
    photo?: string;
    provider: "google" | "github";
  }) => {
    setLoadingAction(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

      // Call backend social login endpoint
      fetch('/api/auth/social-login', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: userData.provider,
          email: userData.email,
          name: userData.name,
          photo: userData.photo,
          id: userData.userId,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          const token = data?.access_token || `token_${userData.provider}_${Date.now()}`;
          localStorage.setItem("access_token", token);
          localStorage.setItem("sl_token", token);
          localStorage.setItem("user", JSON.stringify(userData));
          localStorage.setItem("user_email", userData.email);
          localStorage.setItem("user_name", userData.name);

          if (userData.provider === "google") {
            localStorage.setItem(
              "google_user",
              JSON.stringify({
                googleId: userData.userId,
                given_name: userData.name.split(" ")[0],
                family_name: userData.name.split(" ")[1] || "",
                email: userData.email,
              })
            );
          }

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("userProfileUpdated", { detail: userData }));
          }

          setShowGoogleModal(false);
          setShowGitHubModal(false);
          router.push("/dashboard");
        })
        .catch(() => {
          // Local fallback in case network issues
          const token = `local_${userData.provider}_${Date.now()}`;
          localStorage.setItem("access_token", token);
          localStorage.setItem("sl_token", token);
          localStorage.setItem("user", JSON.stringify(userData));
          localStorage.setItem("user_email", userData.email);
          localStorage.setItem("user_name", userData.name);

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("userProfileUpdated", { detail: userData }));
          }

          setShowGoogleModal(false);
          setShowGitHubModal(false);
          router.push("/dashboard");
        });
    } catch {
      router.push("/dashboard");
    }
  };

  const handleLiveRedirect = (provider: "google" | "github") => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://securelens-backend-o213.onrender.com";
    window.location.href = `${backendUrl}/api/auth/${provider}`;
  };

  const githubLabel = mode === "register" ? "Sign up with GitHub" : "Sign in with GitHub";
  const googleLabel = mode === "register" ? "Sign up with Google" : "Sign in with Google";

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          id="btn-oauth-github"
          onClick={() => (onGitHub ? onGitHub() : handleLiveRedirect("github"))}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs sm:text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white/[0.08] active:translate-y-0 disabled:opacity-50 shadow-sm cursor-pointer"
        >
          <GitHubIcon className="h-4 w-4 text-white shrink-0" />
          <span>{githubLabel}</span>
        </button>

        <button
          type="button"
          id="btn-oauth-google"
          onClick={() => (onGoogle ? onGoogle() : handleLiveRedirect("google"))}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs sm:text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white/[0.08] active:translate-y-0 disabled:opacity-50 shadow-sm cursor-pointer"
        >
          <GoogleIcon className="h-4 w-4 shrink-0" />
          <span>{googleLabel}</span>
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 pt-0.5">
        <button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          className="hover:text-violet-300 transition-colors cursor-pointer"
        >
          Demo Google Account
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => setShowGitHubModal(true)}
          className="hover:text-violet-300 transition-colors cursor-pointer"
        >
          Demo GitHub Account
        </button>
      </div>

      {/* ─── GOOGLE ACCOUNT SELECTION MODAL ─── */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#16171b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 text-white space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md">
                    <GoogleIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Choose an Account</h3>
                    <p className="text-xs text-gray-400">to continue to <span className="text-violet-400 font-semibold">SecureLens</span></p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {!isAddingGoogleAccount ? (
                <div className="space-y-3">
                  {/* Account List */}
                  <div className="space-y-2">
                    {DEFAULT_GOOGLE_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() =>
                          handleOAuthSuccess({
                            userId: acc.id,
                            email: acc.email,
                            name: acc.name,
                            photo: acc.avatar,
                            provider: "google",
                          })
                        }
                        disabled={loadingAction}
                        className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-violet-500/40 transition-all text-left group cursor-pointer disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={acc.avatar}
                            alt={acc.name}
                            className="w-10 h-10 rounded-full border border-white/20 object-cover"
                          />
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                              {acc.name}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">{acc.email}</div>
                          </div>
                        </div>
                        <ArrowRight size={15} className="text-gray-500 group-hover:text-violet-400 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>

                  {/* Add Custom Google Account Button */}
                  <button
                    type="button"
                    onClick={() => setIsAddingGoogleAccount(true)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-white/20 hover:border-violet-400/50 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-gray-300">
                      <Plus size={16} />
                    </div>
                    <span>Use another Google account</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={customGoogleName}
                        onChange={(e) => setCustomGoogleName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Google Email Address</label>
                      <input
                        type="email"
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                        placeholder="e.g. user@gmail.com or work@company.com"
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingGoogleAccount(false)}
                      className="w-1/2 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!customGoogleEmail || !customGoogleName || loadingAction}
                      onClick={() =>
                        handleOAuthSuccess({
                          userId: `google_custom_${Date.now()}`,
                          email: customGoogleEmail,
                          name: customGoogleName,
                          photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
                          provider: "google",
                        })
                      }
                      className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-xs font-bold text-white shadow-md shadow-violet-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {loadingAction ? "Signing in..." : "Continue"}
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Live OAuth Option & Privacy Notice */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => handleLiveRedirect("google")}
                  className="w-full text-center text-[11px] text-violet-400 hover:text-violet-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={12} /> Redirect to live accounts.google.com OAuth server
                </button>
                <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                  To continue, Google will share your name, email address, and profile picture with SecureLens Platform.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── GITHUB AUTHORIZATION MODAL ─── */}
      <AnimatePresence>
        {showGitHubModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#121316] border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 text-white space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white shadow-md">
                    <GitHubIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Authorize SecureLens</h3>
                    <p className="text-xs text-gray-400">GitHub OAuth Security Gateway</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGitHubModal(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Account Confirmation Inputs */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                    <User size={12} className="text-violet-400" /> GitHub Username / Handle
                  </label>
                  <input
                    type="text"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    placeholder="e.g. steve25060"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                    <Mail size={12} className="text-violet-400" /> Primary Email
                  </label>
                  <input
                    type="email"
                    value={githubEmail}
                    onChange={(e) => setGithubEmail(e.target.value)}
                    placeholder="e.g. steve@github.com"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                    <Building size={12} className="text-violet-400" /> Organization (Optional)
                  </label>
                  <input
                    type="text"
                    value={githubOrg}
                    onChange={(e) => setGithubOrg(e.target.value)}
                    placeholder="e.g. SecureLens-Team"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Scopes Requested */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Permissions Requested:</div>
                <div className="space-y-1.5 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                    <span>Read public user profile & verified email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                    <span>Scan authorized repositories for secrets & vulnerabilities</span>
                  </div>
                </div>
              </div>

              {/* Authorize Action Button */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  id="btn-confirm-github-auth"
                  disabled={!githubUsername || !githubEmail || loadingAction}
                  onClick={() =>
                    handleOAuthSuccess({
                      userId: `github_${githubUsername}`,
                      email: githubEmail,
                      name: githubUsername,
                      photo: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80",
                      provider: "github",
                    })
                  }
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loadingAction ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Lock size={14} />
                  )}
                  <span>Authorize SecureLens Platform</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLiveRedirect("github")}
                  className="w-full py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={12} /> Redirect to live github.com/login/oauth
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
