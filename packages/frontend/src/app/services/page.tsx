'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    Package,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';

interface Service {
    id: string;
    name: string;
    category: string;
    description: string;
    status: 'active' | 'inactive' | 'pending';
    capacity?: number;
    duration?: string;
    created_at: string;
    pricing_count: number;
}

export default function ServicesPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(false);

    // Mock services data - in production, fetch from API
    const services: Service[] = [
        {
            id: '1',
            name: 'Premium Wedding Package',
            category: 'Catering',
            description: 'Complete wedding catering with 15+ menu items and live food stations',
            status: 'active',
            capacity: 500,
            duration: '8 hours',
            created_at: '2026-01-15',
            pricing_count: 3,
        },
        {
            id: '2',
            name: 'Photography - Standard',
            category: 'Photography',
            description: 'Professional event photography with 500+ edited photos',
            status: 'active',
            duration: '6 hours',
            created_at: '2026-01-10',
            pricing_count: 2,
        },
        {
            id: '3',
            name: 'Sound & Lighting',
            category: 'Entertainment',
            description: 'Complete audio-visual setup with professional DJ',
            status: 'inactive',
            capacity: 300,
            duration: '10 hours',
            created_at: '2026-01-05',
            pricing_count: 0,
        },
    ];

    const categories = ['All', 'Catering', 'Photography', 'Videography', 'Entertainment', 'Decoration', 'Venue'];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'inactive':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Services</h1>
                    <p className="mt-1 text-surface-500 dark:text-surface-400">
                        Manage your service offerings
                    </p>
                </div>
                <Link
                    href="/services/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
                >
                    <Plus className="h-4 w-4" />
                    Add Service
                </Link>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Total Services', value: services.length, icon: Package },
                    { label: 'Active Services', value: services.filter(s => s.status === 'active').length, icon: Package },
                    { label: 'Categories', value: new Set(services.map(s => s.category)).size, icon: Package },
                    { label: 'Avg Pricing', value: 'PKR 45,000', icon: Package },
                ].map((stat, index) => (
                    <div
                        key={index}
                        className="rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900"
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900/30">
                                <stat.icon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                                <p className="text-sm text-surface-500 dark:text-surface-400">{stat.label}</p>
                                <p className="text-lg font-semibold text-surface-900 dark:text-surface-50">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            className={cn(
                                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                                cat === 'All'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300'
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                    <input
                        type="text"
                        placeholder="Search services..."
                        className="w-full rounded-lg border border-surface-300 pl-10 pr-4 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-surface-700 dark:bg-surface-800"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Services List */}
            <div className="rounded-xl border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-surface-200 bg-surface-50 dark:border-surface-800 dark:bg-surface-900/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-surface-700 dark:text-surface-300">Service</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-surface-700 dark:text-surface-300">Category</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-surface-700 dark:text-surface-300">Status</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-surface-700 dark:text-surface-300">Capacity</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-surface-700 dark:text-surface-300">Pricing</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-surface-700 dark:text-surface-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                            {services.map((service) => (
                                <tr key={service.id} className="hover:bg-surface-50 dark:hover:bg-surface-900/50">
                                    <td className="px-4 py-4">
                                        <div>
                                            <p className="font-medium text-surface-900 dark:text-surface-50">{service.name}</p>
                                            <p className="text-sm text-surface-500 dark:text-surface-400 line-clamp-1">{service.description}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="rounded-full bg-surface-100 px-2 py-1 text-xs font-medium text-surface-700 dark:bg-surface-800 dark:text-surface-300">
                                            {service.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={cn(
                                            'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium',
                                            getStatusColor(service.status)
                                        )}>
                                            <span className={cn(
                                                'h-1.5 w-1.5 rounded-full',
                                                service.status === 'active' ? 'bg-green-600' :
                                                    service.status === 'inactive' ? 'bg-gray-600' : 'bg-yellow-600'
                                            )} />
                                            {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-surface-600 dark:text-surface-400">
                                        {service.capacity ? `${service.capacity} guests` : service.duration || 'N/A'}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-surface-600 dark:text-surface-400">
                                        {service.pricing_count} packages
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/services/${service.id}`}
                                                className="rounded-lg p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800"
                                                title="View"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={`/services/${service.id}/edit`}
                                                className="rounded-lg p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800"
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                            <button
                                                className="rounded-lg p-1.5 text-surface-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {services.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Package className="h-12 w-12 text-surface-300 dark:text-surface-700" />
                        <p className="mt-4 text-surface-500 dark:text-surface-400">No services found</p>
                        <Link
                            href="/services/new"
                            className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:underline"
                        >
                            <Plus className="h-4 w-4" />
                            Add your first service
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
