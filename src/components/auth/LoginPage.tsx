"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { Code2, Zap } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      window.location.href = "/";
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0A0F] font-sans text-zinc-300">
      {/* Left Pane */}
      <div className="hidden lg:flex flex-col relative w-1/2 border-r border-white/[0.04] bg-[#06060C] overflow-hidden">
        
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CgkJPHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTIwIDIwYTEgMSAwIDExMCAyIDEgMSAwIDAxMC0yeiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgZmlsbC1ydWxlPSJldmVub2RkIi8+Cjwvc3ZnPg==')] opacity-[0.15] pointer-events-none" />
        </div>

        <div className="relative z-10 flex flex-col h-full w-full justify-between py-10 xl:py-14 px-14 lg:px-16 xl:px-20">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Code2 className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">CodeStudio</span>
          </div>

          {/* Hero */}
          <div className="flex flex-col w-full my-auto">
            <h1 className="text-[2.5rem] xl:text-[3rem] leading-[1.1] font-bold tracking-tight text-white mb-2">
              Build software <br />
              <span className="text-indigo-400">
                at the speed of thought.
              </span>
            </h1>
            
            <div className="h-8 xl:h-12"></div>

            <div className="flex flex-col gap-5">
              {[
                { title: "Native AI", desc: "Generate and refactor code instantly." },
                { title: "WebContainers", desc: "Run Node.js directly in your browser." },
                { title: "Multi-Framework", desc: "React, Next.js, Vue, and more." },
                { title: "Instant Preview", desc: "Live HMR updates as you code." },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-3.5">
                  <div className="flex-shrink-0 mt-0.5">
                    <Zap className="w-[18px] h-[18px] text-amber-500 fill-amber-500" strokeWidth={0} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[15px] font-semibold text-white mb-0.5">{feature.title}</h3>
                    <p className="text-[13px] text-zinc-400">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2.5 text-[13px] text-zinc-500">
            <span className="text-zinc-500">•</span>
            <span>Enterprise-grade security</span>
          </div>
        </div>
      </div>

      {/* Right Pane */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 lg:px-16 relative">
        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <h2 className="text-[28px] font-bold text-white mb-2 tracking-tight">Get started</h2>
            <p className="text-[15px] text-zinc-400">Sign in to access your projects.</p>
          </div>

          <div className="flex flex-col gap-5">
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-3 h-[52px] rounded-xl font-medium text-[15px] bg-[#14141E] text-white hover:bg-[#1C1C2A] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed border border-white/[0.06]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-[2px] border-zinc-500 border-t-white rounded-full animate-spin" />
              ) : (
                <GoogleIcon className="w-5 h-5" />
              )}
              <span>Continue with Google</span>
            </button>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[14px] text-center">
                {error}
              </div>
            )}

            <div className="text-center text-[14px] text-zinc-400 mt-1">
              Don&apos;t have an account?{" "}
              <a href="#" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign up</a>
            </div>
          </div>
          
          <p className="mt-5 text-center text-[12px] text-zinc-500 leading-relaxed">
            By clicking continue, you agree to our{" "}
            <a href="#" className="text-indigo-400 hover:text-indigo-300">Terms of Service</a> and{" "}
            <a href="#" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}