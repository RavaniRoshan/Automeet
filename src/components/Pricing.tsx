import { Check, Zap, Building, Sparkles } from 'lucide-react';

export default function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      period: 'forever',
      description: 'Perfect for solopreneurs testing AI-powered outreach',
      icon: Sparkles,
      features: [
        'Up to 50 meetings per month',
        'Core automation features',
        'Email & calendar sync',
        'Basic reporting',
        'Community support'
      ],
      cta: 'Start Free',
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$199',
      period: 'per month',
      description: 'For growing teams who need full automation',
      icon: Zap,
      features: [
        'Unlimited meetings',
        'Full automation suite',
        'Advanced reporting calendar',
        'CRM integrations',
        'A/B testing',
        'Priority support',
        'Custom email templates'
      ],
      cta: 'Start Free Trial',
      highlighted: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact sales',
      description: 'For organizations requiring advanced control',
      icon: Building,
      features: [
        'Everything in Pro',
        'API access',
        'SSO & role-based access',
        'Dedicated account manager',
        'Custom onboarding',
        'SLA guarantees',
        'White-label options'
      ],
      cta: 'Book Demo',
      highlighted: false
    }
  ];

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <div
                key={index}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-2 border-blue-600 shadow-2xl scale-105'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-semibold mb-4">
                    Most Popular
                  </div>
                )}

                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  plan.highlighted ? 'bg-white/20' : 'bg-blue-50'
                }`}>
                  <Icon className={`w-6 h-6 ${plan.highlighted ? 'text-white' : 'text-blue-600'}`} />
                </div>

                <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>

                <div className="mb-4">
                  <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-lg ${plan.highlighted ? 'text-blue-100' : 'text-gray-600'}`}>
                    {' '}/ {plan.period}
                  </span>
                </div>

                <p className={`mb-6 ${plan.highlighted ? 'text-blue-100' : 'text-gray-600'}`}>
                  {plan.description}
                </p>

                <button
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all mb-6 ${
                    plan.highlighted
                      ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-sm'
                  }`}
                >
                  {plan.cta}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        plan.highlighted ? 'text-blue-200' : 'text-green-600'
                      }`} />
                      <span className={`text-sm ${plan.highlighted ? 'text-blue-50' : 'text-gray-700'}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              All plans include
            </h3>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 text-blue-600" />
                </div>
                <p className="font-semibold text-gray-900">No credit card</p>
                <p className="text-sm text-gray-600">Start free, upgrade anytime</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <p className="font-semibold text-gray-900">14-day trial</p>
                <p className="text-sm text-gray-600">Test Pro features risk-free</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 text-orange-600" />
                </div>
                <p className="font-semibold text-gray-900">Cancel anytime</p>
                <p className="text-sm text-gray-600">No long-term contracts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
