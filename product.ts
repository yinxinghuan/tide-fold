type TideState = 'loading' | 'guide' | 'idle' | 'folding' | 'ready' | 'release' | 'recovery'

const copy = {
  en: { idle: 'FOLD THE TIDE', folding: 'KEEP FOLDING', ready: 'RELEASE THE SURGE', release: 'TIDE UNBOUND', recovery: 'LET IT SETTLE', unavailable: 'WEBGPU IS UNAVAILABLE', lost: 'THE OCEAN LOST ITS GPU' },
  zh: { idle: '折叠海潮', folding: '继续向内折', ready: '松手释放', release: '海潮解封', recovery: '等待回落', unavailable: '此设备暂不支持 WEBGPU', lost: 'GPU 连接已中断' },
}

function locale(): keyof typeof copy {
  const saved = localStorage.getItem('game_locale')
  if (saved === 'zh' || saved === 'en') return saved
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

class TideAudio {
  context: AudioContext | null = null
  dragOsc: OscillatorNode | null = null
  dragGain: GainNode | null = null

  async wake() {
    if (!this.context) this.context = new AudioContext()
    if (this.context.state === 'suspended') await this.context.resume()
    return this.context
  }

  async press() {
    const ctx = await this.wake()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'; osc.frequency.value = 100
    gain.gain.setValueAtTime(.035, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .07)
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .075)
    this.dragOsc = ctx.createOscillator(); this.dragGain = ctx.createGain()
    this.dragOsc.type = 'sine'; this.dragOsc.frequency.value = 80
    this.dragGain.gain.value = .0001
    this.dragOsc.connect(this.dragGain).connect(ctx.destination); this.dragOsc.start()
  }

  drag(fold: number, speed: number) {
    if (!this.context || !this.dragOsc || !this.dragGain) return
    const now = this.context.currentTime
    this.dragOsc.frequency.setTargetAtTime(80 + Math.min(100, speed * .9), now, .035)
    this.dragGain.gain.setTargetAtTime(.006 + fold * .038, now, .045)
  }

  async ready() {
    const ctx = await this.wake(); const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.type = 'triangle'; osc.frequency.value = 260; gain.gain.value = .025
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .09)
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .095)
  }

  async release() {
    const ctx = await this.wake()
    if (this.dragGain) this.dragGain.gain.setTargetAtTime(.0001, ctx.currentTime, .025)
    if (this.dragOsc) this.dragOsc.stop(ctx.currentTime + .12)
    this.dragGain = null; this.dragOsc = null
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.type = 'sine'; osc.frequency.setValueAtTime(90, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(46, ctx.currentTime + .42)
    gain.gain.setValueAtTime(.07, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .42)
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .43)
  }
}

export class TideFoldExperience {
  canvas: HTMLCanvasElement
  ui = document.querySelector<HTMLElement>('.tf-ui')!
  hint = document.querySelector<HTMLElement>('[data-tf-hint]')!
  guide = document.querySelector<HTMLElement>('[data-tf-guide]')!
  loading = document.querySelector<HTMLElement>('[data-tf-loading]')!
  audio = new TideAudio()
  lang = locale()
  state: TideState = 'loading'
  targetRatio = 1
  fold = 0
  startX = 0
  prevX = 0
  prevTime = 0
  pointerId: number | null = null
  firstFrameAt = 0
  demoStarted = false
  demoStart = 0
  realInput = false
  releaseAt = 0
  releaseFold = 0
  readySoundPlayed = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.setState('loading')
    canvas.addEventListener('pointerdown', this.onDown, { passive: false })
    canvas.addEventListener('pointermove', this.onMove, { passive: false })
    canvas.addEventListener('pointerup', this.onUp, { passive: false })
    canvas.addEventListener('pointercancel', this.onUp, { passive: false })
  }

  setState(state: TideState) {
    this.state = state; this.ui.dataset.state = state
    const key = state === 'ready' ? 'ready' : state === 'release' ? 'release' : state === 'recovery' ? 'recovery' : state === 'folding' ? 'folding' : 'idle'
    this.hint.textContent = copy[this.lang][key]
  }

  setFold(value: number) {
    this.fold = Math.max(0, Math.min(1, value))
    this.targetRatio = 1 - this.fold * .48
    this.ui.style.setProperty('--tf-fold', this.fold.toFixed(4))
  }

  markFirstFrame(time: number) {
    if (this.firstFrameAt) return
    this.firstFrameAt = time
    this.loading.classList.add('is-hidden')
    this.setState('guide')
  }

  update(time: number) {
    if (!this.firstFrameAt || this.realInput) {
      if (this.state === 'release' && time - this.releaseAt >= 180) this.setState('recovery')
      if (this.state === 'recovery') {
        const elapsed = time - this.releaseAt - 180
        this.setFold(Math.max(0, this.releaseFold * (1 - Math.min(1, elapsed / 1650))))
        if (elapsed >= 1650) { this.setFold(0); this.setState('idle') }
      }
      return
    }
    if (!this.demoStarted && time - this.firstFrameAt >= 900) {
      this.demoStarted = true; this.demoStart = time
      this.guide.classList.add('is-visible', 'is-running')
      this.setState('guide')
    }
    if (!this.demoStarted) return
    const elapsed = time - this.demoStart
    if (elapsed < 220) this.setFold(0)
    else if (elapsed < 1150) {
      const p = (elapsed - 220) / 930
      const eased = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      this.setFold(eased * .82)
      this.setState(this.fold >= .72 ? 'ready' : 'folding')
    } else if (elapsed < 1280) this.setFold(.82)
    else if (elapsed < 2930) {
      if (this.state !== 'recovery') { this.releaseAt = 1280 + this.demoStart; this.releaseFold = .82; this.setState('recovery') }
      this.setFold(Math.max(0, .82 * (1 - (elapsed - 1280) / 1650)))
    } else {
      this.setFold(0); this.setState('idle'); this.guide.classList.remove('is-visible', 'is-running')
    }
  }

  cancelDemo() {
    this.realInput = true; this.guide.classList.remove('is-visible', 'is-running')
  }

  onDown = (event: PointerEvent) => {
    if (!event.isPrimary || this.pointerId !== null) return
    event.preventDefault(); this.cancelDemo(); this.pointerId = event.pointerId
    this.canvas.setPointerCapture(event.pointerId)
    this.startX = this.prevX = event.clientX; this.prevTime = performance.now(); this.releaseAt = 0; this.readySoundPlayed = false
    this.setFold(0); this.setState('folding'); void this.audio.press()
  }

  onMove = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) return
    event.preventDefault(); const now = performance.now(); const width = Math.max(320, innerWidth)
    const fold = Math.min(1, Math.abs(event.clientX - this.startX) / (width * .42))
    const speed = Math.abs(event.clientX - this.prevX) / Math.max(.008, (now - this.prevTime) / 1000)
    this.setFold(fold); this.audio.drag(fold, speed); this.prevX = event.clientX; this.prevTime = now
    const ready = fold >= .72
    this.setState(ready ? 'ready' : 'folding')
    if (ready && !this.readySoundPlayed) { this.readySoundPlayed = true; void this.audio.ready() }
  }

  onUp = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) return
    event.preventDefault(); this.pointerId = null; this.releaseAt = performance.now(); this.releaseFold = this.fold; this.setState('release'); void this.audio.release()
  }
}

export function showTideError(message: string, lost = false) {
  const lang = locale(); const error = document.querySelector<HTMLElement>('[data-tf-error]')!
  const errorCopy = document.querySelector<HTMLElement>('[data-tf-error-copy]')!
  const retry = document.querySelector<HTMLButtonElement>('[data-tf-retry]')!
  document.querySelector<HTMLElement>('[data-tf-loading]')?.classList.add('is-hidden')
  document.querySelector<HTMLElement>('.tf-ui')?.classList.add('has-error')
  error.hidden = false
  errorCopy.textContent = message || copy[lang][lost ? 'lost' : 'unavailable']
  retry.onclick = () => location.reload()
}
