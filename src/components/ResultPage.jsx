import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { FaInstagram, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { BsGlobe } from "react-icons/bs";

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [segment, setSegment] = useState(null);

  const result = location.state?.result; // Data passed from SpinWheel

  useEffect(() => {
    if (result) {
      setSegment(result);
      // Optional: Clear localStorage if you want
      // localStorage.removeItem('klnskdr');
    } else {
      // If someone visits /result directly without winning
      navigate("/");
    }
  }, [result, navigate]);

  if (!segment) return null;

  const isWinner = segment.type === "prize";

  return (
    <div className="min-h-screen text-slate-900 flex flex-col items-center justify-center p-6">
      {isWinner && <Confetti recycle={false} numberOfPieces={1000} />}

      <div className="max-w-md w-full text-center">
        <img
          src={`/assets/${segment.imagename}`}
          alt={segment.label}
          className="w-40 h-40 object-contain mx-auto mb-6"
        />

<h1 className="text-4xl font-extrabold mb-2 text-slate-900 drop-shadow-sm">
          {isWinner ? "🎉 CONGRATULATIONS!" : "😔 BETTER LUCK NEXT TIME"}
        </h1>

        <h2 className="text-3xl font-black text-emerald-600 mb-8">
          {segment.label}
        </h2>

        <p className="text-slate-700 text-lg mb-10 font-medium">
          {isWinner
            ? `You've won a ${segment.label}! We'll contact you soon.`
            : "Thank you for spinning. Try again next time!"}
        </p>

        {/* Business Social Media */}
        
<div className="flex justify-center gap-8 text-3xl text-slate-800">
  <a
    href="https://www.instagram.com/metroelectricev/?hl=en"
    target="_blank"
    rel="noopener noreferrer"
    className="hover:text-pink-500 transition"
  >
    <FaInstagram />
  </a>

  <a
    href="https://linkedin.com/company/metropolitan-electric/"
    target="_blank"
    rel="noopener noreferrer"
    className="hover:text-blue-600 transition"
  >
    <FaLinkedin />
  </a>

  <a
    href="https://x.com/metroelectricev"
    target="_blank"
    rel="noopener noreferrer"
    className="hover:text-sky-500 transition"
  >
    <FaXTwitter />
  </a>

  <a
    href="https://metropolitanelectricng.com/"
    target="_blank"
    rel="noopener noreferrer"
    className="hover:text-emerald-600 transition"
  >
    <BsGlobe />
  </a>
 


</div>
        <button
          onClick={() => navigate("/")}
          className="mt-8 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xl px-10 py-4 rounded-full transition active:scale-95"
        >
          SPIN AGAIN
        </button>
      </div>
    </div>
  );
}