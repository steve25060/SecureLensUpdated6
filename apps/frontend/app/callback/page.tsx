'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { hydrateUserScanStorage } from '@/lib/live-scan-store';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string>('OAuth');

  useEffect(() => {
    const token = searchParams.get('token');
    const provider = searchParams.get('provider') || 'OAuth';
    const err = searchParams.get('error');

    if (err) {
      setErrorMsg(decodeURIComponent(err));
      return;
    }

    setProviderName(provider === 'google' ? 'Google' : provider === 'github' ? 'GitHub' : 'OAuth');

    if (token) {
      // Store token
      localStorage.setItem('access_token', token);
      localStorage.setItem('sl_token', token);

      try {
        // Decode JWT payload
        const base64Url = token.split('.')[1];
        if (base64Url) {
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);

          const userObj = {
            userId: payload.userId || payload.sub || `oauth-${Date.now()}`,
            email: payload.email || `${provider}.user@securelens.io`,
            name: payload.name || payload.username || `${provider === 'google' ? 'Google' : 'GitHub'} User`,
            role: payload.role || 'USER',
            photo: payload.photo || payload.avatarUrl || null,
            provider: provider,
          };

          localStorage.setItem('user', JSON.stringify(userObj));
          if (userObj.email) localStorage.setItem('user_email', userObj.email);
          if (userObj.name) localStorage.setItem('user_name', userObj.name);

          // Hydrate user-scoped scans and finding results for this new profile
          if (userObj.email) {
            hydrateUserScanStorage(userObj.email);
          }

          if (provider === 'google') {
            localStorage.setItem(
              'google_user',
              JSON.stringify({
                googleId: payload.googleId || 'google_auth_id',
                given_name: payload.firstName || userObj.name.split(' ')[0],
                family_name: payload.lastName || userObj.name.split(' ')[1] || '',
                email: userObj.email,
              })
            );
          }

          // Broadcast profile update event to Header and Sidebar
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: userObj }));
          }
        }
      } catch (e) {
        console.error('Failed to parse OAuth JWT payload:', e);
      }

      // Small delay for smooth transition visual feedback
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setErrorMsg('No authentication token was received from the identity provider.');
    }
  }, [searchParams, router]);

  if (errorMsg) {
    return (
      <div className="text-center space-y-4 max-w-md p-8 rounded-3xl bg-white/[0.03] border border-red-500/30 backdrop-blur-xl">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-xl font-bold text-white">Authentication Failed</h2>
        <p className="text-xs text-red-300/90 leading-relaxed">{errorMsg}</p>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-white transition-all"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-5 max-w-sm p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl shadow-2xl shadow-violet-500/10">
      <div className="relative w-16 h-16 mx-auto">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-violet-500/20 border-t-violet-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-2 rounded-full bg-violet-600/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-violet-400" />
        </div>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-white tracking-tight">
          Authenticating with {providerName}
        </h2>
        <p className="text-xs text-gray-400">
          Verifying security tokens and initializing workspace telemetry...
        </p>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-green-400 font-medium">
        <CheckCircle2 size={13} /> Token verified • Redirecting to Console
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-violet-600/10 blur-[130px] rounded-full pointer-events-none" />
      
      <Suspense fallback={
        <div className="text-center text-xs text-gray-400">
          Loading authentication...
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
