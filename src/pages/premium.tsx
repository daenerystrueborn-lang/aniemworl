import { Link } from "wouter";
import { Crown, Check, Zap, ShieldOff, Sparkles } from "lucide-react";
import { usePremium } from "@/lib/premium-context";

const features = [
  { icon: <ShieldOff className="w-5 h-5 text-yellow-400" />, title: "Zero Ads", desc: "No banners, no popunders, no interruptions — ever." },
  { icon: <Zap className="w-5 h-5 text-yellow-400" />, title: "Faster Streaming", desc: "Ad scripts never slow down your player." },
  { icon: <Sparkles className="w-5 h-5 text-yellow-400" />, title: "Support the Site", desc: "Help keep Animeastral free for everyone." },
];

export default function PremiumPage() {
  const { isPremium, activate, deactivate } = usePremium();

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 mb-4">
            <Crown className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-3">
            Animeastral <span className="text-yellow-400">Premium</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            Watch everything ad-free. One-time activation, no subscriptions, no signup required.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-3 bg-card border border-border rounded-xl p-4"
            >
              <div className="shrink-0 mt-0.5">{f.icon}</div>
              <div>
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing card */}
        <div className="bg-gradient-to-br from-yellow-400/10 via-card to-card border border-yellow-400/30 rounded-2xl p-6 sm:p-8 text-center shadow-xl shadow-yellow-400/5 mb-6">
          {isPremium ? (
            <>
              <div className="inline-flex items-center gap-2 bg-yellow-400/20 text-yellow-400 px-4 py-1.5 rounded-full text-sm font-bold mb-4">
                <Check className="w-4 h-4" /> Premium Active
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                You're enjoying an ad-free experience. Thank you for supporting the site!
              </p>
              <button
                onClick={deactivate}
                className="text-xs text-muted-foreground hover:text-red-400 underline underline-offset-2 transition-colors"
              >
                Deactivate Premium
              </button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">One-time</p>
              <p className="text-5xl font-black text-foreground mb-1">Free</p>
              <p className="text-muted-foreground text-sm mb-6">
                Activate now — no account or payment needed during beta.
              </p>
              <button
                onClick={activate}
                className="inline-flex items-center gap-2 bg-yellow-400 text-black px-8 py-3 rounded-xl font-bold text-sm hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-yellow-400/30"
              >
                <Crown className="w-4 h-4" /> Activate Premium
              </button>
              <p className="text-[11px] text-muted-foreground mt-4">
                Stored locally on your device. Clears if you clear browser storage.
              </p>
            </>
          )}
        </div>

        {/* What's included list */}
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">What's included</p>
          <ul className="space-y-2.5">
            {[
              "No banner ads on any page",
              "No popunder ads",
              "Faster page load (no ad scripts)",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                <span className="w-4 h-4 rounded-full bg-yellow-400/20 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-yellow-400" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center">
          <Link href="/home" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
