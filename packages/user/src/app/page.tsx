import Link from "next/link";
import { Calendar, Search, MessageSquare, Shield, Sparkles, ArrowRight } from "lucide-react";

const features = [
    {
        icon: Search,
        title: "Find Vendors",
        description: "Discover and compare top-rated vendors for your events in Pakistan.",
    },
    {
        icon: Calendar,
        title: "Plan Events",
        description: "Create detailed event plans with AI-powered recommendations.",
    },
    {
        icon: MessageSquare,
        title: "Chat & Book",
        description: "Message vendors directly and book services seamlessly.",
    },
    {
        icon: Shield,
        title: "Verified Vendors",
        description: "All vendors are verified and reviewed for quality assurance.",
    },
];

const eventTypes = [
    "Weddings",
    "Birthdays",
    "Corporate Events",
    "Mehndi",
    "Conferences",
    "Parties",
];

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            {/* Navbar */}
            <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-lg">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                            <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-semibold text-gray-900">
                            Event-AI
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                            Sign In
                        </Link>
                        <Link
                            href="/register"
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="px-6 py-20 lg:py-32">
                <div className="mx-auto max-w-7xl text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
                        <Sparkles className="h-4 w-4" />
                        AI-Powered Event Planning
                    </div>
                    <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                        Plan Your Perfect Event
                        <br />
                        <span className="text-blue-600">in Pakistan</span>
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
                        Discover top vendors, get AI recommendations, and plan weddings,
                        birthdays, corporate events, and more with ease.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-4">
                        <Link
                            href="/create-event"
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700"
                        >
                            Start Planning
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/marketplace"
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Browse Vendors
                        </Link>
                    </div>

                    {/* Event Types */}
                    <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
                        {eventTypes.map((type) => (
                            <span
                                key={type}
                                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm border border-gray-200"
                            >
                                {type}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="px-6 py-20 bg-white">
                <div className="mx-auto max-w-7xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900">
                            Everything You Need to Plan Events
                        </h2>
                        <p className="mt-4 text-lg text-gray-600">
                            From vendor discovery to booking management, we have you covered.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="rounded-xl bg-gray-50 p-6 hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                                    <feature.icon className="h-6 w-6 text-blue-600" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                                    {feature.title}
                                </h3>
                                <p className="mt-2 text-sm text-gray-600">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="px-6 py-20">
                <div className="mx-auto max-w-4xl rounded-2xl bg-blue-600 px-8 py-16 text-center">
                    <h2 className="text-3xl font-bold text-white">
                        Ready to Plan Your Event?
                    </h2>
                    <p className="mt-4 text-lg text-blue-100">
                        Join thousands of event planners using Event-AI to create memorable experiences.
                    </p>
                    <div className="mt-8 flex items-center justify-center gap-4">
                        <Link
                            href="/register"
                            className="rounded-lg bg-white px-6 py-3 text-base font-medium text-blue-600 hover:bg-gray-100"
                        >
                            Create Free Account
                        </Link>
                        <Link
                            href="/marketplace"
                            className="rounded-lg border border-white px-6 py-3 text-base font-medium text-white hover:bg-white/10"
                        >
                            Explore Vendors
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-200 bg-white px-6 py-12">
                <div className="mx-auto max-w-7xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-gray-900">Event-AI</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            © 2026 Event-AI. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
