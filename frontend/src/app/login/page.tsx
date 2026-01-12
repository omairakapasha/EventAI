'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, Loader2, Building2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const { login, verify2FA, requiresTwoFactor, isLoading, error, clearError } = useAuthStore();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        clearError();
        const success = await login(data.email, data.password);
        if (success) {
            router.push('/dashboard');
        }
    };

    const handle2FASubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        const success = await verify2FA(twoFactorCode);
        if (success) {
            router.push('/dashboard');
        }
    };

    if (requiresTwoFactor) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-600/10 via-surface-50 to-purple-600/10 p-4 dark:from-primary-900/20 dark:via-surface-950 dark:to-purple-900/20">
                <div className="w-full max-w-md">
                    <div className="card">
                        <div className="mb-8 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                                <Lock className="h-7 w-7 text-primary-600 dark:text-primary-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                                Two-Factor Authentication
                            </h1>
                            <p className="mt-2 text-surface-500 dark:text-surface-400">
                                Enter the 6-digit code from your authenticator app
                            </p>
                        </div>

                        <form onSubmit={handle2FASubmit} className="space-y-4">
                            {error && (
                                <div className="rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-900/20 dark:text-error-400">
                                    {error}
                                </div>
                            )}

                            <div>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="input text-center text-2xl tracking-[0.5em] font-mono"
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || twoFactorCode.length !== 6}
                                className="btn-primary w-full"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    'Verify'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => useAuthStore.setState({ requiresTwoFactor: false })}
                                className="btn-ghost w-full text-surface-500"
                            >
                                Back to Login
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-600/10 via-surface-50 to-purple-600/10 p-4 dark:from-primary-900/20 dark:via-surface-950 dark:to-purple-900/20">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25">
                        <Building2 className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                        Welcome Back
                    </h1>
                    <p className="mt-2 text-surface-500 dark:text-surface-400">
                        Sign in to your vendor portal
                    </p>
                </div>

                {/* Login Form */}
                <div className="card">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {error && (
                            <div className="rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-900/20 dark:text-error-400">
                                {error}
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-400" />
                                <input
                                    type="email"
                                    {...register('email')}
                                    placeholder="you@company.com"
                                    className={cn('input pl-11', errors.email && 'input-error')}
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1.5 text-sm text-error-500">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                                    Password
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    {...register('password')}
                                    placeholder="••••••••"
                                    className={cn('input pl-11 pr-11', errors.password && 'input-error')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1.5 text-sm text-error-500">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={isLoading} className="btn-primary w-full">
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 flex items-center">
                        <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
                        <span className="px-4 text-sm text-surface-400">or</span>
                        <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
                    </div>

                    {/* Register Link */}
                    <p className="text-center text-sm text-surface-500 dark:text-surface-400">
                        Don&apos;t have an account?{' '}
                        <Link
                            href="/register"
                            className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                        >
                            Register as a vendor
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
