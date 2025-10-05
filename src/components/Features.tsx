import {
  Mail,
  Calendar,
  MessageCircle,
  BarChart3,
  Globe,
  Shield
} from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: Mail,
      title: 'Autonomous B2B Outreach',
      description: 'Personalized emails crafted for each prospect, A/B tested messaging, intelligent reply detection, and automatic follow-ups. Never miss a reply.',
      color: 'from-blue-600 to-blue-700'
    },
    {
      icon: Calendar,
      title: 'Seamless Scheduling',
      description: 'Time zone smart coordination, instant calendar sync with Google and Outlook, one-click reschedule handling, and automatic conflict resolution.',
      color: 'from-green-600 to-green-700'
    },
    {
      icon: MessageCircle,
      title: 'In-Thread Conversations',
      description: 'All communication happens in one email thread for higher deliverability and better context. AI handles objections, questions, and scheduling naturally.',
      color: 'from-purple-600 to-purple-700'
    },
    {
      icon: BarChart3,
      title: 'Reporting Calendar',
      description: 'See every booking, reschedule, no-show, and outcome in real-time. Visual pipeline tracking with conversion analytics and performance insights.',
      color: 'from-orange-600 to-orange-700'
    },
    {
      icon: Globe,
      title: 'Multi-Platform Integration',
      description: 'Works seamlessly with Gmail, Outlook, Google Meet, Zoom, and Microsoft Teams. Connect your existing tools in one click.',
      color: 'from-cyan-600 to-cyan-700'
    },
    {
      icon: Shield,
      title: 'Enterprise-Grade Security',
      description: 'Role-based access control, comprehensive audit logs, SOC 2 Type II compliance, GDPR ready, and encrypted data at rest and in transit.',
      color: 'from-red-600 to-red-700'
    }
  ];

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Everything you need to automate meetings
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Built for B2B teams who need predictable pipeline growth without hiring more SDRs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all group"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>

                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12">
          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <p className="text-5xl font-bold mb-2">10x</p>
              <p className="text-blue-100">Faster outreach vs. manual</p>
            </div>
            <div>
              <p className="text-5xl font-bold mb-2">89%</p>
              <p className="text-blue-100">Average reply rate</p>
            </div>
            <div>
              <p className="text-5xl font-bold mb-2">24/7</p>
              <p className="text-blue-100">Always working, never sleeping</p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl">
            Start Free Trial
          </button>
          <p className="text-sm text-gray-500 mt-4">No credit card required · 14-day free trial</p>
        </div>
      </div>
    </section>
  );
}
