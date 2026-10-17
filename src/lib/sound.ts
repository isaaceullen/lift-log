let audioContext: AudioContext | null = null

export function playChime(): void {
  const Context =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Context) return
  if (!audioContext) audioContext = new Context()
  const context = audioContext
  if (context.state === 'suspended') void context.resume()
  const now = context.currentTime
  const gain = context.createGain()
  gain.connect(context.destination)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
  for (const frequency of [523.25, 784]) {
    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    oscillator.connect(gain)
    oscillator.start(now)
    oscillator.stop(now + 0.46)
  }
}

export function buzz(): void {
  navigator.vibrate?.([50, 40, 80])
}
