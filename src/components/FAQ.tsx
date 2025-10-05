import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How autonomous is AutoMeet really?',
      answer: 'AutoMeet is fully autonomous from initial outreach to meeting confirmation. Once you share your goal and target contacts, the AI handles email personalization, sending, reply monitoring, objection handling, calendar coordination, rescheduling, and follow-ups. You only step in when a meeting is booked and ready for you to join.'
    },
    {
      question: 'Will my emails end up in spam?',
      answer: 'AutoMeet uses sophisticated deliverability best practices including proper email authentication, domain reputation monitoring, conversation-style threading, and smart sending patterns. All communication happens in email threads to maximize deliverability. Our customers average 89% reply rates, indicating strong inbox placement.'
    },
    {
      question: 'What happens if someone wants to reschedule?',
      answer: 'AutoMeet automatically handles reschedule requests within the email thread. The AI understands natural language requests, checks your calendar availability in real-time, proposes new times, and confirms the updated meeting — all without any manual work from you.'
    },
    {
      question: 'How does AutoMeet integrate with my existing tools?',
      answer: 'AutoMeet connects seamlessly with Gmail, Outlook, Google Calendar, Outlook Calendar, Google Meet, Zoom, and Microsoft Teams. For Pro and Enterprise plans, we also offer CRM integrations with Salesforce, HubSpot, and Pipedrive. Setup takes less than 5 minutes with OAuth connections.'
    },
    {
      question: 'Is my data secure and compliant?',
      answer: 'Yes. AutoMeet is SOC 2 Type II certified and GDPR compliant. All data is encrypted at rest and in transit using AES-256 and TLS 1.3. We never share your data with third parties, and Enterprise plans include role-based access control, audit logs, and SSO support.'
    },
    {
      question: 'Can I customize the email messaging?',
      answer: 'Absolutely. While AutoMeet uses AI to personalize each message based on prospect context, you can provide messaging guidelines, value propositions, and tone preferences. Pro plans include custom email templates and A/B testing to optimize your conversion rates.'
    },
    {
      question: 'What makes AutoMeet different from other sales automation tools?',
      answer: 'Most tools require extensive manual setup, template building, and ongoing management. AutoMeet is truly autonomous — you describe your goal in natural language, and the AI handles everything end-to-end. Plus, all communication stays in email threads for better deliverability and context preservation.'
    },
    {
      question: 'How quickly can I start booking meetings?',
      answer: 'You can send your first automated outreach within 10 minutes of signing up. Most customers see their first booked meetings within 48 hours. The onboarding process is a simple conversation where you share your goals, and AutoMeet takes it from there.'
    }
  ];

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Frequently asked questions
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about AutoMeet
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl overflow-hidden hover:border-blue-200 transition-colors"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-8">
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <Minus className="w-5 h-5 text-blue-600 flex-shrink-0" />
                ) : (
                  <Plus className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {openIndex === index && (
                <div className="px-6 pb-5 bg-gray-50">
                  <p className="text-gray-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 text-center border border-blue-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Still have questions?
          </h3>
          <p className="text-gray-600 mb-6">
            Our team is here to help you get started with AutoMeet
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md">
              Contact Sales
            </button>
            <button className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:border-gray-400 hover:bg-white transition-all">
              View Documentation
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
