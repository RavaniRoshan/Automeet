import { Star, Quote } from 'lucide-react';

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Founder & CEO',
      company: 'TechFlow',
      image: 'SC',
      quote: 'AutoMeet doubled our meeting pipeline in the first month. The AI handles everything — from initial outreach to rescheduling — all on autopilot. Best decision we made this quarter.',
      rating: 5
    },
    {
      name: 'Marcus Rodriguez',
      role: 'Head of Sales',
      company: 'GrowthLabs',
      image: 'MR',
      quote: 'Follow-ups and reschedules are no longer bottlenecks for our team. AutoMeet freed up 15 hours per week per rep, letting them focus on closing deals instead of chasing calendars.',
      rating: 5
    },
    {
      name: 'Emily Thompson',
      role: 'VP Revenue',
      company: 'CloudVenture',
      image: 'ET',
      quote: 'We replaced two SDRs with AutoMeet and saw better results. The reporting is crystal clear, and knowing exactly what\'s happening in our pipeline at all times is a game-changer.',
      rating: 5
    }
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Trusted by revenue leaders
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join hundreds of B2B teams using AutoMeet to scale their meeting pipeline
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100 relative">
              <Quote className="w-10 h-10 text-blue-200 mb-4" />

              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-orange-400 text-orange-400" />
                ))}
              </div>

              <p className="text-gray-700 leading-relaxed mb-6">
                "{testimonial.quote}"
              </p>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold">
                  {testimonial.image}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                  <p className="text-sm text-gray-500">{testimonial.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Featured in leading tech publications
                </h3>
                <p className="text-gray-600 mb-6">
                  AutoMeet is recognized as a category leader in AI-powered sales automation
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-orange-400 text-orange-400" />
                    ))}
                  </div>
                  <span className="text-gray-700 font-semibold">4.9/5.0 on Product Hunt</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {['TechCrunch', 'Product Hunt', 'VentureBeat', 'Forbes'].map((publication) => (
                  <div key={publication} className="bg-white rounded-xl p-6 flex items-center justify-center border border-gray-100">
                    <span className="text-gray-400 font-bold text-lg">{publication}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
