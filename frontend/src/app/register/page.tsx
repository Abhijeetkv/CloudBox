"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Cloud, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { registerUser, loginUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const registerSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null);
    try {
      const regResponse = await registerUser(data.email, data.password);
      if (regResponse.success) {
        toast.success("Account created successfully! Logging you in...");
        // Auto-login after registration
        try {
          const loginResponse = await loginUser(data.email, data.password);
          if (loginResponse.success && loginResponse.data) {
            login(loginResponse.data.token, loginResponse.data.user);
            router.push("/dashboard");
            return;
          }
        } catch {
          // If auto-login fails, redirect to login page
          router.push("/login");
          return;
        }
      } else {
        setServerError(regResponse.error || "Registration failed");
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Registration failed. User may already exist or backend is unreachable.";
      setServerError(errorMsg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-4 text-slate-900">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 shadow-md shadow-sky-500/20">
              <Cloud className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Cloud<span className="text-sky-600">Box</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-slate-500">
            Create an account to start storing your files
          </p>
        </div>

        {/* Clean White Theme Card Container */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm text-slate-900">
          <div className="space-y-1 mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Create an account
            </h1>
            <p className="text-sm text-slate-500">
              Enter your email and choose a secure password
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50"
                  {...register("email")}
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50"
                  {...register("password")}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50"
                  {...register("confirmPassword")}
                  disabled={isSubmitting}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>

            <div className="pt-2 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-sky-600 hover:text-sky-700 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
