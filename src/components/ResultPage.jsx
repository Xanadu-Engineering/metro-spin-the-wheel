import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { FaInstagram, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { BsGlobe } from "react-icons/bs";
import { IS_PRODUCTION_ENV } from "../config/spinEnvironment";
import { getStoredSpin } from "../utils/spinLock";

const SOCIAL_LINKS = [
  { href: "https://www.instagram.com/metroelectricev/?hl=en", label: "Metropolitan Electric on Instagram", Icon: FaInstagram },
  { href: "https://linkedin.com/company/metropolitan-electric/", label: "Metropolitan Electric on LinkedIn", Icon: FaLinkedin },
  { href: "https://x.com/metroelectricev", label: "Metropolitan Electric on X", Icon: FaXTwitter },
  { href: "https://metropolitanelectricng.com/", label: "Metropolitan Electric website", Icon: BsGlobe },
];

const socialLinkClass =
  "grid h-[2.65rem] w-[2.65rem] place-items-center rounded-full bg-metro-light text-[1.25rem] text-metro-dark transition-[transform,color,background-color] duration-[170ms] hover:-translate-y-px hover:bg-metro-dark hover:text-white max-[640px]:h-[2.45rem] max-[640px]:w-[2.45rem] max-[640px]:text-[1.15rem]";

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [storedSpin] = useState(() => getStoredSpin());
  const segment = location.state?.result || storedSpin?.result;

  useEffect(() => {
    if (!segment) {
      // If someone visits /result directly without winning
      navigate("/");
    }
  }, [segment, navigate]);

  if (!segment) return null;

  const isWinner = segment.type === "prize";

  return (
    <main className="grid min-h-[100dvh] place-items-center p-6 [@media(max-height:640px)]:p-4">
      {isWinner && (
        <Confetti
          recycle={false}
          numberOfPieces={700}
          colors={["#10B981", "#111827", "#ffffff", "#D1FAE5"]}
        />
      )}

      <section
        className="w-[min(100%,28rem)] rounded-[1.35rem] bg-white/[0.93] p-[clamp(1.25rem,4vw,1.5rem)] text-center shadow-[0_1.7rem_4rem_rgba(17,24,39,0.28)]"
        aria-label="Spin result"
      >
        <a
          className="mx-auto mb-4 flex w-fit max-w-full items-center justify-center gap-[0.7rem] rounded-full bg-metro-dark px-[0.8rem] py-2 text-white no-underline"
          href="https://metropolitanelectricng.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Metropolitan Electric website"
        >
          <img className="h-8 w-8 shrink-0 object-contain invert max-[640px]:h-7 max-[640px]:w-7" src="/brand/metro-mark.svg" alt="" aria-hidden="true" />
          <span className="whitespace-nowrap text-[0.9rem] font-bold uppercase leading-none tracking-[0.02em] max-[640px]:text-[0.78rem] max-[380px]:text-[0.7rem]">
            Metropolitan Electric
          </span>
        </a>

        <p
          className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
            isWinner ? "bg-metro-green/10 text-metro-green" : "bg-black/5 text-[#6b7280]"
          }`}
        >
          {isWinner ? "Congratulations" : "Better luck next time"}
        </p>

        <div className="relative mx-auto mb-[1.2rem] h-[clamp(7.5rem,32vw,10.5rem)] w-[clamp(7.5rem,32vw,10.5rem)] overflow-hidden [@media(max-height:640px)]:mb-[0.8rem] [@media(max-height:640px)]:h-[clamp(6rem,22vh,9rem)] [@media(max-height:640px)]:w-[clamp(6rem,22vh,9rem)]">
          <img
            className={isWinner ? "absolute inset-0 h-full w-full object-contain" : "absolute inset-0 m-auto h-[55%] w-[55%] object-contain"}
            src={isWinner ? `/assets/${segment.imagename}` : "/brand/metro-mark.svg"}
            alt={isWinner ? segment.label : "Metropolitan Electric"}
          />
        </div>

        <h1 className="m-0 font-display text-[clamp(1.7rem,1.2rem+2.6vw,2.35rem)] font-[950] leading-[1.04] text-metro-green [overflow-wrap:break-word]">
          {segment.label}
        </h1>

        <p className="mx-auto mt-4 max-w-[24rem] text-[clamp(0.9rem,0.82rem+0.4vw,1rem)] font-semibold leading-[1.55] text-[#4b5563] [@media(max-height:640px)]:mt-3">
          {isWinner
            ? `You won a ${segment.label}. Please show this screen to the Metropolitan Electric team.`
            : "Thank you for spinning. We are glad you joined us."}
        </p>

        <div className="mt-[1.35rem] flex flex-wrap justify-center gap-3" aria-label="Metropolitan Electric social links">
          {SOCIAL_LINKS.map(({ href, label, Icon }) => (
            <a
              key={href}
              className={socialLinkClass}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
            >
              <Icon />
            </a>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-[1.8rem] inline-flex min-h-[2.85rem] cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(180deg,#34d399,#10b981)] px-[1.75rem] text-[0.85rem] font-bold uppercase tracking-[0.06em] text-[#04130d] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_0.7rem_1.5rem_rgba(16,185,129,0.32)] transition-[transform,box-shadow,filter] duration-[180ms] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0.95rem_1.9rem_rgba(16,185,129,0.42)] active:translate-y-0 active:scale-[0.98]"
        >
          {IS_PRODUCTION_ENV ? "Back to wheel" : "Spin again"}
        </button>
      </section>
    </main>
  );
}
