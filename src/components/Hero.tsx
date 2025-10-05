import { Bot, Calendar, TrendingUp, CheckCircle2, Play } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
}

export default function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
              <Bot className="w-4 h-4" />
              <span>AI-Powered Appointment Setting</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight">
              Meetings on <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">autopilot</span>
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              B2B booking, outreach, and reporting — fully handled by AI. Turn your intent into confirmed meetings. No SDR. No manual follow-ups.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Autonomous outreach</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Smart scheduling</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Live results</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button onClick={onGetStarted} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                Get Started Free
              </button>
              <button className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-4 rounded-lg font-semibold text-lg hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                See Demo
              </button>
            </div>

            <div className="pt-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Trusted by leading B2B teams</p>
              <div className="flex flex-wrap items-center gap-8">
                {['TechFlow', 'SalesHub', 'GrowthLabs', 'CloudVenture', 'DataCore'].map((brand) => (
                  <div key={brand} className="text-gray-400 dark:text-gray-600 font-semibold text-lg">
                    {brand}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center animate-pulse">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">AutoMeet AI</p>
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    Active
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Today's Activity</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">47</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Emails Sent</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">12</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Meetings</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">89%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Reply Rate</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3">
                    <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Meeting scheduled</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Sarah Chen @ TechCorp - Tomorrow 2pm</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg p-3">
                    <TrendingUp className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Positive reply received</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Mike Johnson @ SalesHub</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg p-3">
                    <Calendar className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Reschedule processed</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Alex Rivera @ GrowthLabs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full blur-3xl opacity-20"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
