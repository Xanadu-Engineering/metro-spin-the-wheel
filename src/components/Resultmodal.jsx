import Confetti from "react-confetti";

function ResultModal({ isOpen, segment, onClose }) {
  if (!isOpen || !segment) return null;

  const isWinner = segment.type === "prize";

  return (
    <>
      {isWinner && (
        <Confetti
          recycle={false}
          numberOfPieces={500}
        />
      )}

      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-sm">

        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-[90%] p-8 text-center relative">

          <img
            src={`/assets/${segment.imagename}`}
            alt={segment.label}
            className="w-32 h-32 object-contain mx-auto mb-4"
          />

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isWinner
              ? "🎉 Congratulations!"
              : "😔 Better Luck Next Time"}
          </h2>

          <h3 className="text-xl font-black text-emerald-600 mb-4">
            {segment.label}
          </h3>

          <p className="text-gray-600 mb-6">
            {isWinner
              ? `Fantastic! You've won a ${segment.label}.`
              : "Sorry you lost."}
          </p>

          {/* <button
            onClick={onClose}
            className="bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold px-6 py-3 rounded-full transition"
          >
            Spin Again
          </button> */}

        </div>

      </div>
    </>
  );
}

export default ResultModal;