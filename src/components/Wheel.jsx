import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { SEGMENTS, getRandomSegment, getSegmentIndex } from "../data/segments"
import {
  IS_PRODUCTION_ENV,
  claimProductionSpin,
  getProductionSpinStatus,
  getStoredSpin,
  rememberSpin,
} from "../utils/spinLock"

const SPIN_DURATION_MS = 4600
const PRIZE_LABELS = new Set([
  "STICKER",
  "NOTE PAD & PEN",
  "TOTE BAG",
  "KEY HOLDER",
])

export default function SpinWheel() {
  const navigate = useNavigate()
  const [isSpinning, setIsSpinning] = useState(false)
  const [isClaimingSpin, setIsClaimingSpin] = useState(false)
  const [isCheckingSpin, setIsCheckingSpin] = useState(IS_PRODUCTION_ENV)
  const wheelRef = useRef(null)
  const pointerRef = useRef(null)
  const tickRafRef = useRef(null)

  const totalSegments = SEGMENTS.length
  const degreesPerSegment = 360 / totalSegments

  const [cachedPrize, setCachedPrize] = useState(null)
  const [cannotSpin, setCannotSpin] = useState(false)
  const [spinMessage, setSpinMessage] = useState("")

  // Stop the pointer's tick loop and return it to its resting position.
  const stopPointerTicks = useCallback(() => {
    if (tickRafRef.current) {
      cancelAnimationFrame(tickRafRef.current)
      tickRafRef.current = null
    }
    if (pointerRef.current) {
      pointerRef.current.style.animation = "none"
      pointerRef.current.style.transform = ""
    }
  }, [])

  // Drive the pointer off the wheel's *actual* rotation: every time a segment
  // edge passes under it, knock it sideways like a real peg pointer. Because we
  // read the live (decelerating) angle, the ticks slow down with the wheel and
  // stop the moment it stops.
  const startPointerTicks = () => {
    const wheel = wheelRef.current
    const pointer = pointerRef.current
    if (!wheel || !pointer) return

    stopPointerTicks()

    let lastBoundary = null

    const readWheelAngle = () => {
      const matrix = getComputedStyle(wheel).transform
      if (!matrix || matrix === "none") return 0
      const values = matrix.match(/matrix\(([^)]+)\)/)
      if (!values) return 0
      const [a, b] = values[1].split(",").map(Number)
      return Math.atan2(b, a) * (180 / Math.PI)
    }

    const tick = () => {
      const angle = readWheelAngle()
      const normalized = ((angle % 360) + 360) % 360
      const boundary = Math.floor(normalized / degreesPerSegment)

      if (lastBoundary !== null && boundary !== lastBoundary) {
        // Restart the knock animation for each peg that passes.
        pointer.style.animation = "none"
        void pointer.offsetWidth // force reflow so the animation replays
        pointer.style.animation = "metroPointerTick 0.22s ease-out"
      }
      lastBoundary = boundary
      tickRafRef.current = requestAnimationFrame(tick)
    }

    tickRafRef.current = requestAnimationFrame(tick)
  }

  const handleSpin = async () => {
    if (
      isSpinning ||
      isClaimingSpin ||
      isCheckingSpin ||
      cannotSpin ||
      !wheelRef.current
    )
      return

    setSpinMessage("")
    setIsClaimingSpin(true)

    let selectedPrize

    try {
      if (IS_PRODUCTION_ENV) {
        const claim = await claimProductionSpin()

        if (!claim.allowed || !claim.spin?.result) {
          const previousResult = claim.spin?.result || cachedPrize

          setCachedPrize(previousResult || null)
          setCannotSpin(true)
          setSpinMessage(
            previousResult
              ? `This device has already spun. Previous result: ${previousResult.label}.`
              : "This device has already used its spin.",
          )
          return
        }

        selectedPrize = claim.spin.result
        setCannotSpin(true)
      } else {
        selectedPrize = getRandomSegment()
        rememberSpin(selectedPrize)
      }
    } catch (error) {
      setSpinMessage(error.message || "Unable to verify this device right now.")
      setCannotSpin(IS_PRODUCTION_ENV)
      return
    } finally {
      setIsClaimingSpin(false)
    }

    const winningIndex = getSegmentIndex(selectedPrize.id)

    if (winningIndex < 0 || !wheelRef.current) return

    setIsSpinning(true)
    setCachedPrize(selectedPrize)
    startPointerTicks()

    const extraRounds = 5 * 360
    const targetAngle = 360 - winningIndex * degreesPerSegment
    const centerOffset = degreesPerSegment / 2
    const finalRotation = extraRounds + targetAngle - centerOffset

    wheelRef.current.style.transition =
      "transform 4s cubic-bezier(0.1, 0.8, 0.3, 1)"
    wheelRef.current.style.transform = `rotate(${finalRotation}deg)`

    setTimeout(() => {
      setIsSpinning(false)
      stopPointerTicks()

      if (wheelRef.current) {
        wheelRef.current.style.transition = "none"
        wheelRef.current.style.transform = `rotate(${finalRotation % 360}deg)`
      }

      navigate("/result", {
        state: { result: selectedPrize },
      })
    }, SPIN_DURATION_MS)
  }

  useEffect(() => {
    let isMounted = true

    async function loadSpinState() {
      const storedSpin = getStoredSpin()

      if (storedSpin?.result) {
        setCachedPrize(storedSpin.result)
      }

      if (!IS_PRODUCTION_ENV) {
        setCannotSpin(false)
        setIsCheckingSpin(false)
        return
      }

      try {
        const status = await getProductionSpinStatus()

        if (!isMounted) return

        const previousResult = status.spin?.result || storedSpin?.result || null

        if (previousResult) {
          setCachedPrize(previousResult)
        }

        if (status.hasSpun && !status.canSpin) {
          setCannotSpin(true)
          setSpinMessage(
            previousResult
              ? `This device has already spun. Previous result: ${previousResult.label}.`
              : "This device has already used its spin.",
          )
        } else {
          // Either a fresh device, or a "TRY AGAIN" landing that earned one more spin.
          setCannotSpin(false)
          setSpinMessage(
            status.hasSpun
              ? "You landed on TRY AGAIN — you have one more spin!"
              : "",
          )
        }
      } catch (error) {
        if (!isMounted) return

        setCannotSpin(true)
        setSpinMessage(
          error.message || "Unable to verify this device right now.",
        )
      } finally {
        if (isMounted) {
          setIsCheckingSpin(false)
        }
      }
    }

    loadSpinState()

    return () => {
      isMounted = false
      stopPointerTicks()
    }
  }, [stopPointerTicks])

  const isSpinDisabled =
    isSpinning || isClaimingSpin || isCheckingSpin || cannotSpin
  const buttonLabel =
    isCheckingSpin || isClaimingSpin
      ? "Checking..."
      : isSpinning
        ? "Spinning..."
        : cannotSpin
          ? "Already Spun"
          : "Spin Wheel"

  return (
    <main className="wheel-page" aria-label="Metropolitan Electric spin wheel">
      <a
        className="site-logo-link"
        href="https://metropolitanelectricng.com/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit Metropolitan Electric website"
      >
        <img src="/brand/metro-mark.svg" alt="" aria-hidden="true" />
        <span>Metropolitan Electric</span>
      </a>

      <section className="wheel-stage">
        <div className="wheel-rig">
          <div ref={pointerRef} className="wheel-pointer" aria-hidden="true">
            <svg
              width="48"
              height="58"
              viewBox="0 0 40 50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 50C20 50 40 30 40 16C40 7.16344 32.8366 0 24 0H16C7.16344 0 0 7.16344 0 16C0 30 20 50 20 50Z"
                fill="#111827"
              />
              <path
                d="M20 40C20 40 34 26 34 16C34 8.26801 27.732 2 20 2C12.268 2 6 8.26801 6 16C6 26 20 40 20 40Z"
                fill="#10B981"
              />
              <circle cx="20" cy="16" r="5" fill="#111827" />
            </svg>
          </div>

          <div
            ref={wheelRef}
            className="spin-wheel"
            style={{
              background: `conic-gradient(${SEGMENTS.map((seg, i) => {
                const color = seg.colorClass === "dark" ? "#111827" : "#f3f4f6"
                return `${color} ${i * degreesPerSegment}deg ${(i + 1) * degreesPerSegment}deg`
              }).join(", ")})`,
            }}
          >
            {SEGMENTS.map((seg, i) => {
              const rotation = i * degreesPerSegment
              const isDark = seg.colorClass === "dark"

              return (
                <div key={seg.id}>
                  <div
                    className="wheel-divider"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  >
                    <div />
                  </div>

                  <div
                    className="wheel-segment"
                    style={{
                      transform: `rotate(${rotation + degreesPerSegment / 2}deg)`,
                    }}
                  >
                    <div
                      className={
                        isDark ? "segment-content is-dark" : "segment-content"
                      }
                    >
                      <span>{seg.label}</span>
                      <div className="segment-icon">
                        {PRIZE_LABELS.has(seg.label) && (
                          <img
                            src={`/assets/${seg.imagename}`}
                            alt={seg.label}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="wheel-cap">
              <img src="/brand/metro-mark.svg" alt="Metropolitan Electric" />
            </div>
          </div>
        </div>

        <div className="wheel-base">
          <h1>METRO</h1>
          <h2>ELECTRIC</h2>
          <p>DRIVE THE FUTURE</p>

          <button
            type="button"
            onClick={handleSpin}
            disabled={isSpinDisabled}
            className="mt-[1.4rem] inline-flex min-h-[2.85rem] min-w-44 cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(180deg,#34d399,#10b981)] px-[1.7rem] text-[0.85rem] font-bold uppercase tracking-[0.06em] text-[#04130d] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_0.7rem_1.5rem_rgba(16,185,129,0.32)] transition-[transform,box-shadow,filter] duration-180 enabled:hover:-translate-y-0.5 enabled:hover:brightness-105 enabled:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0.95rem_1.9rem_rgba(16,185,129,0.42)] enabled:active:translate-y-0 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-none disabled:bg-metro-text disabled:text-[#6b7280] disabled:shadow-none"
          >
            {buttonLabel}
          </button>
        </div>

        {spinMessage && (
          <p className="spin-message" role="status" aria-live="polite">
            {spinMessage}
          </p>
        )}
      </section>
    </main>
  )
}
