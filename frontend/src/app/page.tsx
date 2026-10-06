"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Cloud,
  ShieldCheck,
  Zap,
  HardDrive,
  ArrowRight,
  Lock,
  Layers,
  Sparkles,
  CheckCircle,
} from "lucide-react";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/20">
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              CloudBox
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/dashboard">
                  Go to Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-32">
          {/* Subtle gradient background glow */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 transform-gpu blur-3xl sm:-top-80">
            <div className="aspect-[1155/678] w-[72rem] bg-gradient-to-tr from-blue-600 to-indigo-400 opacity-20" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-4 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300 mb-8 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next-Gen Cloud File Storage Architecture</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 max-w-4xl mx-auto leading-tight sm:leading-tight">
              Blazing Fast, Secure File Storage for Modern Workflows
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Store, stream, and manage your documents, media, and archives with enterprise-grade MinIO S3 object storage backed by Go and PostgreSQL.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 text-base shadow-lg shadow-blue-500/25"
              >
                <Link href="/register">
                  Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-8 text-base"
              >
                <Link href="/login">Sign In with Existing Account</Link>
              </Button>
            </div>

            {/* Highlights badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> MinIO S3 Object Storage
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Go / Gin Microsecond API
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Redis Cache & Worker Pool
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Zero File Size Throttling
              </span>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16 sm:py-24 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Engineered for Reliability & Scale
              </h2>
              <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
                Every component is carefully orchestrated to deliver immediate file previews, encrypted multi-tenant storage, and seamless management.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-8 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-6">
                  <HardDrive className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Object Storage with MinIO
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Files are streamed directly into isolated S3 buckets with UUID namespace hashing, preventing collision and ensuring data protection.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-8 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 mb-6">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Stateless JWT Authentication
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Cryptographically verified JWT tokens secure every REST operation. Strict user boundaries ensure your files are accessible only by you.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-8 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-6">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Asynchronous Worker Pool
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Metadata processing and cache invalidation are offloaded to background Go goroutine worker pools and Redis, keeping response times instant.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-blue-600 flex items-center justify-center text-white">
              <Cloud className="h-3 w-3" />
            </div>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              CloudBox
            </span>
            <span>— Cloud File Storage Engine</span>
          </div>
          <p>© 2026 CloudBox Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
