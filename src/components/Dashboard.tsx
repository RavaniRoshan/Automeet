import { TrendingUp, Calendar, Mail, Users, ArrowUp } from 'lucide-react';

export default function Dashboard() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Real-time visibility into every interaction
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Track meetings booked, reply rates, pipeline velocity, and conversion metrics in one unified dashboard. No setup required.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <h3 className="text-white font-semibold text-lg">AutoMeet Dashboard</h3>
            <div className="flex items-center gap-2 text-white text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    23%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">342</p>
                <p className="text-sm text-gray-600">Emails Sent</p>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    45%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">89</p>
                <p className="text-sm text-gray-600">Meetings Booked</p>
              </div>

              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    12%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">73%</p>
                <p className="text-sm text-gray-600">Reply Rate</p>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    8%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">156</p>
                <p className="text-sm text-gray-600">Active Prospects</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Upcoming Meetings</h4>
                <div className="space-y-3">
                  {[
                    { name: 'Sarah Chen', company: 'TechCorp', time: 'Today, 2:00 PM', status: 'confirmed' },
                    { name: 'Mike Johnson', company: 'SalesHub', time: 'Today, 4:30 PM', status: 'confirmed' },
                    { name: 'Alex Rivera', company: 'GrowthLabs', time: 'Tomorrow, 10:00 AM', status: 'pending' },
                    { name: 'Jessica Wu', company: 'DataCore', time: 'Tomorrow, 3:00 PM', status: 'confirmed' }
                  ].map((meeting, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {meeting.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{meeting.name}</p>
                          <p className="text-xs text-gray-500">{meeting.company}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-700">{meeting.time}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${meeting.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {meeting.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Recent Activity</h4>
                <div className="space-y-3">
                  {[
                    { action: 'Meeting scheduled', detail: 'Sarah Chen @ TechCorp', time: '5 min ago', color: 'blue' },
                    { action: 'Positive reply', detail: 'Mike Johnson @ SalesHub', time: '12 min ago', color: 'green' },
                    { action: 'Follow-up sent', detail: 'David Park @ CloudVenture', time: '23 min ago', color: 'gray' },
                    { action: 'Reschedule processed', detail: 'Alex Rivera @ GrowthLabs', time: '1 hour ago', color: 'orange' },
                    { action: 'Initial outreach', detail: 'Lisa Martinez @ FinTech', time: '2 hours ago', color: 'gray' }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        activity.color === 'blue' ? 'bg-blue-500' :
                        activity.color === 'green' ? 'bg-green-500' :
                        activity.color === 'orange' ? 'bg-orange-500' :
                        'bg-gray-400'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-600">{activity.detail}</p>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-lg text-gray-700 mb-2 font-medium">
            Real-time results. Actionable insights. No setup required.
          </p>
          <p className="text-gray-600 mb-6">
            Start tracking your automated pipeline in minutes
          </p>
          <button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl">
            Get Started Free
          </button>
        </div>
      </div>
    </section>
  );
}
