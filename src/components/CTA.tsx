import { ArrowRight, Zap } from 'lucide-react';

interface CTAProps {
  onGetStarted: () => void;
}

export default function CTA({ onGetStarted }: CTAProps) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl opacity-20"></div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium mb-8">
          <Zap className="w-4 h-4" />
          <span>Join 500+ teams automating their pipeline</span>
        </div>

        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Ready to automate your meetings?
        </h2>

        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Start your free trial today. No credit card required. Book your first AI-generated meeting in minutes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button onClick={onGetStarted} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="bg-white text-blue-700 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-all shadow-xl flex items-center justify-center gap-2">
            Book a Demo
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-blue-100 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Free forever plan</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>14-day Pro trial</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Cancel anytime</span>
          </div>
        </div>

        <div className="mt-12 pt-12 border-t border-blue-500/30">
          <p className="text-blue-200 text-sm mb-4">Need help getting started?</p>
          <div className="flex flex-wrap justify-center gap-6 text-white">
            <a href="#" className="hover:text-blue-200 transition-colors font-medium">Documentation</a>
            <a href="#" className="hover:text-blue-200 transition-colors font-medium">API Reference</a>
            <a href="#" className="hover:text-blue-200 transition-colors font-medium">Contact Sales</a>
            <a href="#" className="hover:text-blue-200 transition-colors font-medium">Support</a>
          </div>
        </div>
      </div>
    </section>
  );
}
