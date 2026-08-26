'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { ShiningText } from '@/components/common/ShiningText';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for small projects and teams getting started',
    price: '₹0',
    period: '/month',
    features: [
      'Up to 5 targets',
      'Basic templates',
      'Real-time scanning',
      'API access',
      'Email support',
      'Community templates',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Professional',
    description: 'For growing teams with advanced security needs',
    price: '₹1,999',
    period: '/month',
    features: [
      'Unlimited targets',
      'All templates',
      'Priority scanning',
      'Advanced API',
      'Priority support',
      'Custom templates',
      'Team collaboration',
      'Compliance reports',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with complex requirements',
    price: 'Custom',
    period: 'contact sales',
    features: [
      'Everything in Professional',
      'Dedicated support',
      'Custom integrations',
      'On-premises option',
      'SLA guarantee',
      'Advanced analytics',
      'Threat intelligence',
      'Custom branding',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-24" id="pricing">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500 rounded-full mix-blend-multiply filter blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 sm:px-6 lg:px-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            <ShiningText>Simple, Transparent Pricing</ShiningText>
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-8">
            Choose the plan that fits your security needs
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              className={`relative group ${plan.popular ? 'md:scale-105' : ''}`}
            >
              {/* Glow Effect */}
              {plan.popular && (
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
              )}

              {/* Card */}
              <div
                className={`relative h-full rounded-xl backdrop-blur transition-all duration-300 ${
                  plan.popular
                    ? 'bg-[#0b1020]/75 border border-violet-400/50 shadow-2xl'
                    : 'bg-[#0b1020]/75 border border-white/10 group-hover:border-violet-400/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className={`text-5xl font-bold ${plan.popular ? 'text-violet-400' : 'text-white'}`}>
                        {plan.price}
                      </span>
                      {plan.price !== 'Custom' && (
                        <span className="text-gray-400 text-sm">
                          {plan.period}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    className={`w-full py-3 rounded-lg font-semibold mb-8 transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/50'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {plan.cta}
                  </button>

                  {/* Features */}
                  <div className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.popular ? 'text-violet-400' : 'text-purple-400'}`} />
                        <span className="text-gray-300 text-sm">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
