"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";

import AuthCard from "@/components/auth/AuthCard";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import { hydrateUserScanStorage } from "@/lib/live-scan-store";
import api from "@/lib/api";

const fieldVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.45, ease: "easeOut" as const },
  }),
};

export default function LoginForm() {
  const [email, setEmail] = useState("test@gmail.com");
  const [password, setPassword] = useState("Test@1234");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      // Send both username and email to guarantee backend compatibility
      const res = await api.post('/auth/login', { 
        username: email.trim(),
        email: email.trim(),
        password 
      });
      
      const data = res.data;
      const token = data?.access_token || `token_${Date.now()}`;
      localStorage.setItem("access_token", token);
      localStorage.setItem("sl_token", token);

      // Store user data
      // Clear old session
      localStorage.removeItem("securelens_workspaces_global");
      localStorage.removeItem("securelens_live_scans");
      localStorage.removeItem("securelens_live_findings");
      localStorage.removeItem("securelens_reports_global");
      localStorage.removeItem("securelens_active_scan_session");

      const userData = data?.user || {
        id: `user_${Date.now()}`,
        email: email.trim(),
        name: email.split('@')[0] || 'User',
        role: 'USER',
      };
      
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("user_email", userData.email || email.trim());
      const name = userData.name || userData.username || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || email.split('@')[0];
      localStorage.setItem("user_name", name);

      // Broadcast profile update event to Header and Sidebar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: userData }));
      }

      // Hydrate user-scoped scan and finding results
      hydrateUserScanStorage(userData.email || email.trim());

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      // If network error (e.g. backend offline) and using default test credentials, allow offline session
      const isDefaultCreds = (email.trim().toLowerCase() === 'test@gmail.com' || email.trim().toLowerCase() === 'test') && password === 'Test@1234';
      if (isDefaultCreds && (!err.response || err.message?.includes('Network Error') || err.code === 'ECONNREFUSED')) {
        const token = `demo_token_${Date.now()}`;
        localStorage.setItem("access_token", token);
        localStorage.setItem("sl_token", token);
        const fallbackUser = {
          id: 'test-user-1',
          email: 'test@gmail.com',
          name: 'SecureLens Demo',
          role: 'USER',
        };
        localStorage.setItem("user", JSON.stringify(fallbackUser));
        localStorage.setItem("user_email", fallbackUser.email);
        localStorage.setItem("user_name", fallbackUser.name);
        hydrateUserScanStorage(fallbackUser.email);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: fallbackUser }));
        }
        router.push("/dashboard");
        return;
      }

      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Invalid email or password. Please try again.";
      setError(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard>
      <motion.form className="space-y-6" initial="hidden" animate="show" onSubmit={handleSubmit}>
        <motion.div variants={fieldVariants} custom={0} className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Welcome Back
          </h1>
          <p className="max-w-md text-sm leading-6 text-white/55">
            Sign in to access scans, findings, and your SecureLens security dashboard.
          </p>
        </motion.div>

        <div className="space-y-4">
          <motion.div variants={fieldVariants} custom={1} className="space-y-2">
            <label className="block text-sm font-medium text-white/75" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-violet-400/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet-500/20"
            />
          </motion.div>

          <motion.div variants={fieldVariants} custom={2}>
            <PasswordInput
              label="Password"
              name="login-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </motion.div>

          <motion.div
            variants={fieldVariants}
            custom={3}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <label className="flex items-center gap-2 text-white/70">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent text-violet-500 focus:ring-violet-500/30"
              />
              Remember me
            </label>
            <Link href="/auth/forgot-password" className="text-violet-300 transition hover:text-violet-200">
              Forgot Password?
            </Link>
          </motion.div>
        </div>

        {error && (
          <motion.div
            variants={fieldVariants}
            custom={3.5}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            role="alert"
          >
            {error}
          </motion.div>
        )}

        <motion.button
          variants={fieldVariants}
          custom={4}
          whileHover={{ scale: isLoading ? 1 : 1.01 }}
          whileTap={{ scale: isLoading ? 1 : 0.99 }}
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 via-violet-500 to-fuchsia-500 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(124,58,237,0.28)] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? "Signing in…" : "Login"}
          {!isLoading && <ArrowRight className="h-4 w-4" />}
        </motion.button>

        <motion.div variants={fieldVariants} custom={5} className="flex items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-[0.3em] text-white/35">Or continue with</span>
          <div className="h-px flex-1 bg-white/10" />
        </motion.div>

        <motion.div variants={fieldVariants} custom={6}>
          <SocialLoginButtons />
        </motion.div>

        <motion.p variants={fieldVariants} custom={7} className="text-center text-sm text-white/55">
          New to SecureLens?{" "}
          <Link href="/register" className="font-medium text-violet-300 transition hover:text-violet-200">
            Create an account
          </Link>
        </motion.p>
      </motion.form>
    </AuthCard>
  );
}
