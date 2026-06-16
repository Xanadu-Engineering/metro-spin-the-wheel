import { useState, useRef } from 'react';

// Define the structure for our wheel segments

const SEGMENTS = [
  { id: 1, label: 'STICKER', type: 'prize', colorClass: 'dark' , imagename: 'sticker.jpeg'},	
  { id: 2, label: 'NOTE PAD & PEN', type: 'prize', colorClass: 'light', imagename: 'notepadandpen.jpeg' },
  { id: 3, label: 'TRY AGAIN', type: 'loss', colorClass: 'dark', imagename: 'tryagain.jpeg' },
  { id: 4, label: 'TOTE BAG', type: 'prize', colorClass: 'light', imagename: 'totebag.jpeg' },
  { id: 5, label: 'KEY HOLDER', type: 'prize', colorClass: 'dark', imagename: 'keyholder.jpeg' },
  { id: 6, label: 'OOPS! BETTER LUCK', type: 'loss', colorClass: 'light', imagename: 'oops.jpeg' },
  { id: 7, label: 'TRY AGAIN', type: 'loss', colorClass: 'dark', imagename: 'tryagain.jpeg' },
];

export default function SpinWheel() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [prize, setPrize] = useState(null);
  const wheelRef = useRef(null);
  
  const totalSegments = SEGMENTS.length;
  const degreesPerSegment = 360 / totalSegments;

  const handleSpin = () => {
    if (isSpinning || !wheelRef.current) return;

    setIsSpinning(true);
    setPrize(null);

    // 1. Pick a random winning segment index
    const winningIndex = Math.floor(Math.random() * totalSegments);
    const selectedPrize = SEGMENTS[winningIndex];

    // 2. Calculate rotation
    // Spin at least 5 full rounds (1800 deg) for visual suspense
    const extraRounds = 5 * 360; 
    
    // Calculate the target angle to line up with the top pointer (0 degrees)
    // We subtract the angle because the wheel spins clockwise, moving segments backwards relative to the top
    const targetAngle = 360 - (winningIndex * degreesPerSegment);
    
    // Center the pointer perfectly in the middle of the chosen segment
    const centerOffset = degreesPerSegment / 2;
    const finalRotation = extraRounds + targetAngle - centerOffset;

    // 3. Apply animation directly via inline style/web animation API to persist state cleanly
    wheelRef.current.style.transition = 'transform 4s cubic-bezier(0.1, 0.8, 0.3, 1)';
    wheelRef.current.style.transform = `rotate(${finalRotation}deg)`;

    // 4. Handle spin completion
    setTimeout(() => {
      setIsSpinning(false);
      setPrize(selectedPrize);
      
      // Optional: Reset transition and normalize rotation to keep degrees under 360
      if (wheelRef.current) {
        wheelRef.current.style.transition = 'none';
        wheelRef.current.style.transform = `rotate(${finalRotation % 360}deg)`;
      }
    }, 4000); // Must match the CSS transition duration
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      
      {/* Outer Wrapper with Stand */}
      <div className="relative flex flex-col items-center select-none">
        
        {/* Top Ticker / Pointer */}
        <div className="absolute top-[-16px] z-30 filter drop-shadow-md transition-transform duration-100">
          <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 50C20 50 40 30 40 16C40 7.16344 32.8366 0 24 0H16C7.16344 0 0 7.16344 0 16C0 30 20 50 20 50Z" fill="#111827"/>
            <path d="M20 40C20 40 34 26 34 16C34 8.26801 27.732 2 20 2C12.268 2 6 8.26801 6 16C6 26 20 40 20 40Z" fill="#10B981"/>
            <circle cx="20" cy="16" r="5" fill="#111827"/>
          </svg>
        </div>

        {/* The Spinning Wheel */}
        <div 
          ref={wheelRef}
          className="relative w-[500px] h-[500px] rounded-full border-8 border-gray-900 shadow-2xl overflow-hidden ring-4 ring-emerald-500/30"
          style={{
            // Generates alternating segments dynamically matching the image style
            background: `conic-gradient(${SEGMENTS.map((seg, i) => {
              const color = seg.colorClass === 'dark' ? '#111827' : '#f3f4f6';
              return `${color} ${i * degreesPerSegment}deg ${(i + 1) * degreesPerSegment}deg`;
            }).join(', ')})`
          }}
        >
          {/* Segment Content (Text & Lines) */}
          {SEGMENTS.map((seg, i) => {
            const rotation = i * degreesPerSegment;
            const isDark = seg.colorClass === 'dark';

            return (
              <div key={seg.id}>
                {/* Boundary Divider Line */}
                <div 
                  className="absolute top-0 left-1/2 w-[2px] h-1/2 bg-white/40 origin-bottom transform -translate-x-1/2"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  {/* Outer boundary dot node */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow" />
                </div>

                {/* Content Container (Rotated into the middle of the segment slice) */}
                <div 
                  className="absolute top-0 left-0 w-full h-full flex justify-center origin-center"
                  style={{ transform: `rotate(${rotation + (degreesPerSegment / 2)}deg)` }}
                >
                  <div className={`mt-12 flex flex-col items-center text-center max-w-[100px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <span className="text-xs font-black tracking-wider uppercase leading-tight">
                      {seg.label}
                    </span>
                    {/* Placeholder for assets/icons - standard sizing configured here */}
                    <div className="w-15 h-12 mt-4 opacity-80 flex items-center justify-center ">
                    <img 
                        src={`/assets/${seg.imagename}`} 
                        alt={seg.label} 
                        className="w-20 h-16 object-contain mt-2 drop-shadow-md" 
                    />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Central Logo Cap */}
          <div className="absolute inset-0 m-auto w-24 h-24 bg-gray-900 border-4 border-white rounded-full flex items-center justify-center shadow-xl z-20">
            {/* Steering Wheel/Metro Icon SVG */}
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white stroke-2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 1 0 20" />
              <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
              <path d="M12 12L3 12" />
              <path d="M12 12L21 12" />
            </svg>
          </div>
        </div>

        {/* Bottom Base / Brand Stand */}
        <div className="w-[300px] bg-gray-950 mt-[-4px] pt-12 pb-6 px-6 rounded-b-2xl text-center shadow-xl border-t-4 border-emerald-500 z-10 flex flex-col items-center">
          <h2 className="text-lg font-bold tracking-widest text-white">METRO</h2>
          <p className="text-xs font-bold tracking-widest text-white">ELECTRIC</p>

          <p className="text-xs tracking-widest text-gray-400 mt-0.5">DRIVE THE FUTURE</p>
          <p className="text-xs tracking-widest text-gray-400 mt-0.5">DRIVE ELECTRIC</p>
          
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className={`mt-6 px-8 py-2.5 rounded-full font-bold uppercase tracking-wider text-sm transition-all shadow-md ${
              isSpinning 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-emerald-500 text-gray-950 hover:bg-emerald-400 active:scale-95'
            }`}
          >
            {isSpinning ? 'Spinning...' : 'Spin Wheel'}
          </button>
        </div>
      </div>

      {/* Win Modal / Announcement */}
      {prize && (
        <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center max-w-sm animate-bounce">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Result</p>
          <h3 className="text-xl font-black mt-1">
            {prize.type === 'prize' ? `✨ You won a ${prize.label}!` : `❌ ${prize.label}`}
          </h3>
        </div>
      )}
    </div>
  );
}