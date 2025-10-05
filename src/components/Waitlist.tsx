import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, User, Building, Briefcase, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Waitlist() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingEntry, setExistingEntry] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    company: '',
    role: ''
  });

  useEffect(() => {
    if (user) {
      checkExistingEntry();
    }
  }, [user]);

  const checkExistingEntry = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('waitlist')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setExistingEntry(data);
      setSubmitted(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({
          user_id: user.id,
          email: user.email!,
          full_name: formData.fullName,
          company: formData.company,
          role: formData.role
        });

      if (error) throw error;

      await checkExistingEntry();
      setSubmitted(true);
    } catch (err) {
      console.error('Error joining waitlist:', err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted && existingEntry) {
    return (
      <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100 dark:border-gray-700">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                You're on the waitlist!
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                AutoMeet is not available yet, but you're in line for early access
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-xl p-6 mb-8 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Position</span>
                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  #{existingEntry.position}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Joined {new Date(existingEntry.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">We'll notify you via email</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You'll receive an email at <span className="font-medium">{existingEntry.email}</span> when it's your turn
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Early access benefits</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Priority support, extended trial period, and influence on feature development
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Your Information</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-900 dark:text-white">Name:</span> {existingEntry.full_name}
                </p>
                {existingEntry.company && (
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-900 dark:text-white">Company:</span> {existingEntry.company}
                  </p>
                )}
                {existingEntry.role && (
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-900 dark:text-white">Role:</span> {existingEntry.role}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100 dark:border-gray-700">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              AutoMeet is coming soon
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Join the waitlist to get early access when we launch
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Acme Inc."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Founder & CEO"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-lg font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Joining waitlist...</span>
                </>
              ) : (
                <span>Join Waitlist</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="grid md:grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Early Access</p>
                <p className="text-gray-600 dark:text-gray-400">Be first to use AutoMeet</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Extended Trial</p>
                <p className="text-gray-600 dark:text-gray-400">30 days free Pro access</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Priority Support</p>
                <p className="text-gray-600 dark:text-gray-400">Direct line to our team</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
