import React from 'react';
import { Star, Quote } from 'lucide-react';
import { ViewType } from '../../types';

interface TestimonialsSectionProps {
    onNavigate: (view: ViewType) => void;
}

const testimonials = [
    {
        quote: "Found a wonderful caregiver for my mom in 2 days. The AI matching actually works! She's been with us for 6 months now and feels like family.",
        author: "Sarah M.",
        role: "Daughter in San Jose",
        rating: 5,
        avatar: "https://ui-avatars.com/api/?name=Sarah+M&background=0D9488&color=fff&size=128"
    },
    {
        quote: "Saved us 40% compared to the agency we were using. Same quality care, half the price. The video interviews let us really get to know the caregivers first.",
        author: "Michael R.",
        role: "Son in Santa Clara",
        rating: 5,
        avatar: "https://ui-avatars.com/api/?name=Michael+R&background=0284C7&color=fff&size=128"
    },
    {
        quote: "The background check process gave me peace of mind. I knew exactly who was coming into my father's home. The GPS check-ins are a game-changer.",
        author: "Emma J.",
        role: "Daughter in Mountain View",
        rating: 5,
        avatar: "https://ui-avatars.com/api/?name=Emma+J&background=F97316&color=fff&size=128"
    },
    {
        quote: "I make $28/hour instead of $18 with agencies. CareConnex lets me build real relationships with clients while earning what I deserve.",
        author: "Maria G.",
        role: "Caregiver in Palo Alto",
        rating: 5,
        avatar: "https://ui-avatars.com/api/?name=Maria+G&background=8B5CF6&color=fff&size=128"
    },
    {
        quote: "When our caregiver called out sick, CareConnex found us a backup within 30 minutes. The system actually works when you need it most.",
        author: "David K.",
        role: "Son in Cupertino",
        rating: 5,
        avatar: "https://ui-avatars.com/api/?name=David+K&background=EC4899&color=fff&size=128"
    },
    {
        quote: "The insurance and tax handling is seamless. I just show up and care for my clients. Everything else is handled automatically.",
        author: "James L.",
        role: "Caregiver in Sunnyvale",
        rating: 5,
        avatar: "https://ui-avatars.com/api/?name=James+L&background=10B981&color=fff&size=128"
    }
];

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = () => {
    return (
        <section className="py-24 bg-slate-50 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-teal-100/30 rounded-full blur-3xl opacity-60"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-3xl opacity-60"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                        Loved by Families.<br />
                        <span className="text-teal-600">Trusted by Caregivers.</span>
                    </h2>
                    <p className="text-xl text-slate-600">
                        Real stories from families who found the perfect care match.
                    </p>
                </div>

                {/* Testimonials Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <div 
                            key={i} 
                            className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow duration-300 flex flex-col"
                        >
                            {/* Quote Icon */}
                            <div className="mb-6">
                                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center">
                                    <Quote className="w-6 h-6 text-teal-600" />
                                </div>
                            </div>

                            {/* Stars */}
                            <div className="flex text-orange-400 mb-4 gap-1">
                                {[...Array(t.rating)].map((_, j) => (
                                    <Star key={j} className="w-5 h-5 fill-current" />
                                ))}
                            </div>

                            {/* Quote */}
                            <p className="text-slate-700 mb-8 leading-relaxed flex-grow text-lg">
                                "{t.quote}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center pt-6 border-t border-slate-100">
                                <img 
                                    src={t.avatar} 
                                    alt={t.author}
                                    className="w-12 h-12 rounded-full mr-4 border-2 border-white shadow-sm"
                                />
                                <div>
                                    <p className="font-bold text-slate-900">{t.author}</p>
                                    <p className="text-sm text-slate-500">{t.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trust Indicators */}
                <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-slate-400">
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white" />
                            ))}
                        </div>
                        <span className="text-sm">Join 50k+ happy families</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-orange-400 fill-current" />
                        <span className="text-sm font-medium text-slate-600">4.9/5 average rating</span>
                    </div>
                </div>
            </div>
        </section>
    );
};
