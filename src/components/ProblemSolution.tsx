import { X, Check } from 'lucide-react';

export default function ProblemSolution() {
  const problems = [
    'Manual outreach wastes hours every day',
    'Missed follow-ups cost valuable deals',
    'Rescheduling is a never-ending headache',
    'No visibility into what\'s actually working'
  ];

  const solutions = [
    'AI handles all outreach automatically',
    'Never miss a reply or follow-up again',
    'Instant rescheduling in-thread',
    'Real-time reporting on every interaction'
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Stop losing deals to manual processes
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your sales team shouldn't be spending hours on email follow-ups and calendar coordination. Let AI handle the entire appointment setting workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 border-2 border-red-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">The Old Way</h3>
            </div>
            <div className="space-y-4">
              {problems.map((problem, index) => (
                <div key={index} className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">{problem}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t border-gray-100">
              <p className="text-sm text-gray-500 font-medium">RESULT:</p>
              <p className="text-lg font-semibold text-red-600 mt-2">Wasted time, missed opportunities, frustrated teams</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-8 border-2 border-blue-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-green-400 rounded-full blur-3xl opacity-20"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">The AutoMeet Way</h3>
              </div>
              <div className="space-y-4">
                {solutions.map((solution, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 font-medium">{solution}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-blue-200">
                <p className="text-sm text-gray-600 font-medium">RESULT:</p>
                <p className="text-lg font-semibold text-blue-700 mt-2">More meetings, zero manual work, predictable pipeline</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-lg text-gray-700 mb-6">
            AutoMeet replaces an entire SDR team with AI that never sleeps, never forgets, and scales instantly.
          </p>
          <button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl">
            Start Your Free Trial
          </button>
        </div>
      </div>
    </section>
  );
}
