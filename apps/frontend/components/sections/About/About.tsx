'use client';

import { motion } from 'framer-motion';
import { ShiningText } from '@/components/common/ShiningText';

export default function About() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-24" id="about">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500 rounded-full mix-blend-multiply filter blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              <ShiningText>About SecureLens</ShiningText>
            </h2>
            <p className="text-gray-300 text-lg mb-6 leading-relaxed">
              SecureLens is built by security professionals for security professionals.
              We believe that vulnerability detection and threat intelligence should be
              accessible, affordable, and effective for organizations of all sizes.
            </p>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Our platform combines the power of multiple security scanning engines with
              AI-powered analysis to deliver comprehensive security insights with minimal
              false positives. We're committed to staying at the forefront of security
              technology and helping organizations protect what matters most.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Security Pros', value: '10K+' },
                { label: 'Orgs Protected', value: '500+' },
                { label: 'Vulnerabilities Found', value: '1M+' },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="text-2xl font-bold text-violet-400">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Side - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🔍', title: 'Discover', desc: 'Identify vulnerabilities' },
                { icon: '📊', title: 'Analyze', desc: 'Deep threat analysis' },
                { icon: '🚨', title: 'Alert', desc: 'Real-time notifications' },
                { icon: '✅', title: 'Remediate', desc: 'Track fixes' },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  viewport={{ once: true }}
                  className="p-6 rounded-lg bg-[#0b1020]/75 border border-white/10 hover:border-violet-400/30 transition-all duration-300"
                >
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <h4 className="font-bold text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </motion.div>
              ))}
            </div>


          </motion.div>
        </div>
      </div>
    </section>
  );
}
