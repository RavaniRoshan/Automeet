import { MessageSquare, Zap, BarChart3, ArrowRight } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: MessageSquare,
      title: 'Share Your Goal',
      description: 'Tell AutoMeet who you want to meet and why. Our AI gathers your target accounts, ideal contacts, and unique value proposition through a simple conversation.',
      features: ['Natural language intake', 'Account targeting', 'Messaging customization']
    },
    {
      icon: Zap,
      title: 'AI Handles Outreach',
      description: 'AutoMeet crafts personalized emails, monitors replies, handles objections, manages rescheduling, and syncs with your calendar — all automatically.',
      features: ['Personalized outreach', 'Reply parsing', 'Calendar sync']
    },
    {
      icon: BarChart3,
      title: 'Track Everything Live',
      description: 'See every booking, reschedule, no-show, and outcome in real-time. Get actionable insights on what\'s working and optimize your pipeline continuously.',
      features: ['Reporting calendar', 'Conversion dashboard', 'Actionable insights']
    }
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            How AutoMeet works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From goal to booked meeting in three simple steps. No configuration, no training, no manual work.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100 h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-blue-600 mb-1">STEP {index + 1}</div>
                      <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-6 leading-relaxed">
                    {step.description}
                  </p>

                  <div className="space-y-2">
                    {step.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-8 h-8 text-blue-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-center text-white">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-3xl font-bold mb-4">See it in action</h3>
            <p className="text-blue-100 text-lg mb-8">
              Watch how AutoMeet transforms a simple goal into a full pipeline of qualified meetings in minutes, not weeks.
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
              <div className="aspect-video bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg flex items-center justify-center">
                <button className="w-20 h-20 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                  <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-blue-600 border-b-[12px] border-b-transparent ml-1"></div>
                </button>
              </div>
              <p className="text-sm text-blue-200 mt-4">3-minute product demo</p>
            </div>
            <button className="mt-8 bg-white text-blue-700 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl">
              Try AutoMeet Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
