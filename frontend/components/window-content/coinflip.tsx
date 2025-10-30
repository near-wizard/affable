import { useState } from 'react'
import Confetti from 'react-confetti'

export default function CoinFlipGame() {
  const [result, setResult] = useState<'Heads' | 'Tails' | null>(null)
  const [consecutive, setConsecutive] = useState(0)
  const [flipping, setFlipping] = useState(false)
  const [rotation, setRotation] = useState(90) // start on heads face
  const [confettiActive, setConfettiActive] = useState(false)

  function getNextRotation(currentRotation: number, result: 'Heads' | 'Tails') {
    const offset = 90 // coin starts with heads showing at 90°
  
    // Determine which side is currently showing
    const isCurrentlyHeads = Math.floor((currentRotation + offset) / 180) % 2 === 0
    const targetIsHeads = result === 'Heads'
  
    // Add forward spins
    const fullSpins = 3 + Math.floor(Math.random() * 3)
    let nextRotation = currentRotation + fullSpins * 360
  
    // Add 180° if we need to flip to the other side
    if (isCurrentlyHeads != targetIsHeads) {
      nextRotation += 180
    }
  
    return nextRotation
  }
  
  


  const flipCoin = () => {
    if (flipping) return
    setFlipping(true)
  
    const newResult = Math.random() < 0.5 ? 'Heads' : 'Tails'
    const nextRotation = getNextRotation(rotation, newResult)
  
    setRotation(nextRotation)
  
    setTimeout(() => {
      
      setFlipping(false)
    }, 1800)
    if(consecutive > 2 && result == newResult){
        setConfettiActive(true)
        setTimeout(() => setConfettiActive(false), 3000)
    }
    setConsecutive(result ==  newResult ? consecutive+1:1)
    setResult(newResult)
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-6">
      {confettiActive && <Confetti numberOfPieces={300 + Math.random() * 300} />}
      <h2 className="text-xl font-bold">Flip a Coin!</h2>

      <div style={{ perspective: '1000px' }} className="w-32 h-32">
        <div
          className="w-full h-full relative transition-transform duration-[1800ms] ease-in-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${rotation}deg) rotateX(${0}deg) rotateZ(${0}deg)`
          }}
        >
          {/* Heads */}
          <div
            className="absolute w-full h-full flex items-center justify-center text-6xl shadow-2xl rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border-4 border-yellow-600"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(90deg)'
            }}
          >
            🧑
          </div>
          {/* Tails */}
          <div
            className="absolute w-full h-full flex items-center justify-center text-6xl shadow-2xl rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border-4 border-yellow-600"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(270deg)'
            }}
          >
            🪙
          </div>
        </div>
      </div>

      {result && !flipping && (
        <div className="text-center" aria-live="polite">
          <p className="text-2xl font-bold text-foreground mb-2">Result: {result}</p>
          <p className="text-lg text-muted-foreground">
            {consecutive} {consecutive === 1 ? 'time' : 'times'} in a row
          </p>
        </div>
      )}

      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        onClick={flipCoin}
        disabled={flipping}
      >
        {flipping ? 'Flipping...' : 'Flip Coin'}
      </button>

      {consecutive >= 3 && !flipping && (
        <p className="text-sm text-purple-600 font-medium animate-pulse">
          🎉 {consecutive} in a row! You're on a streak!
        </p>
      )}
    </div>
  )
}
