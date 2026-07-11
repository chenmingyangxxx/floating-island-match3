type AmbienceMood = "home" | "level";
type SoundCue =
  | "ui"
  | "select"
  | "swap"
  | "invalid"
  | "match"
  | "matchBig"
  | "reward"
  | "lowMoves"
  | "win"
  | "lose"
  | "adOpen"
  | "adReward";

interface ToneOptions {
  frequency: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
  delay?: number;
  attack?: number;
  release?: number;
}

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

const audioWindow = window as AudioWindow;
const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

class AudioDirector {
  private context?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private sfxGain?: GainNode;
  private ambienceTimer?: number;
  private musicStep = 0;
  private currentMood?: AmbienceMood;
  private unlocked = false;

  startAmbience(mood: AmbienceMood): void {
    this.currentMood = mood;
    if (!this.unlocked) {
      return;
    }

    this.ensureContext();
    this.stopAmbienceLoop();
    this.scheduleAmbience();
  }

  unlock(): void {
    if (!AudioContextCtor) {
      return;
    }

    const context = this.ensureContext();
    void context.resume();
    this.unlocked = true;

    if (this.currentMood && this.ambienceTimer === undefined) {
      this.scheduleAmbience();
    }
  }

  play(cue: SoundCue): void {
    if (!this.unlocked) {
      return;
    }

    switch (cue) {
      case "ui":
        this.pluck([660], 0.09, 0.035);
        break;
      case "select":
        this.pluck([520, 780], 0.12, 0.035);
        break;
      case "swap":
        this.pluck([420, 560], 0.1, 0.04);
        this.noise(0.055, 0.025, 1200);
        break;
      case "invalid":
        this.softNegative();
        break;
      case "match":
        this.matchSparkle(false);
        break;
      case "matchBig":
        this.matchSparkle(true);
        break;
      case "reward":
        this.pluck([523, 659, 784, 1046], 0.28, 0.04);
        break;
      case "lowMoves":
        this.pluck([330, 294], 0.18, 0.04, "triangle");
        break;
      case "win":
        this.pluck([523, 659, 784, 1046, 1318], 0.5, 0.05);
        break;
      case "lose":
        this.pluck([392, 330, 262], 0.45, 0.045, "triangle");
        break;
      case "adOpen":
        this.pluck([392, 523], 0.18, 0.035, "triangle");
        break;
      case "adReward":
        this.pluck([587, 740, 880, 1175], 0.42, 0.045);
        break;
      default:
        break;
    }
  }

  private ensureContext(): AudioContext {
    if (!AudioContextCtor) {
      throw new Error("WebAudio is not supported");
    }

    if (this.context && this.master && this.musicGain && this.sfxGain) {
      return this.context;
    }

    this.context = new AudioContextCtor();
    this.master = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();

    this.master.gain.value = 0.85;
    this.musicGain.gain.value = 0.22;
    this.sfxGain.gain.value = 0.58;
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.context.destination);
    return this.context;
  }

  private scheduleAmbience(): void {
    if (!this.currentMood || !this.context || !this.musicGain) {
      return;
    }

    const mood = this.currentMood;
    const musicGain = this.musicGain;
    const progression = mood === "home"
      ? [
          [261.63, 329.63, 392, 523.25],
          [293.66, 369.99, 440, 587.33],
          [329.63, 392, 493.88, 659.25],
          [246.94, 329.63, 392, 493.88],
        ]
      : [
          [293.66, 369.99, 440, 587.33],
          [329.63, 392, 493.88, 659.25],
          [261.63, 329.63, 392, 523.25],
          [349.23, 440, 523.25, 698.46],
        ];
    const chord = progression[this.musicStep % progression.length];
    this.musicStep += 1;

    chord.forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: 4.2,
        delay: index * 0.08,
        volume: 0.026,
        type: "sine",
        attack: 0.65,
        release: 1.7,
      }, musicGain);
    });

    const melody = mood === "home"
      ? [659.25, 783.99, 880, 783.99, 659.25, 587.33, 659.25, 523.25]
      : [587.33, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 659.25];
    melody.forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: 0.28,
        delay: 0.26 + index * 0.32,
        volume: 0.024,
        type: "triangle",
        attack: 0.012,
        release: 0.18,
      }, musicGain);
    });
    this.noise(2.8, 0.012, 720, musicGain, 0.35);

    this.ambienceTimer = window.setTimeout(() => this.scheduleAmbience(), 3400);
  }

  private stopAmbienceLoop(): void {
    if (this.ambienceTimer !== undefined) {
      window.clearTimeout(this.ambienceTimer);
      this.ambienceTimer = undefined;
    }
  }

  private pluck(
    frequencies: number[],
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
  ): void {
    if (!this.context || !this.sfxGain) {
      return;
    }

    const sfxGain = this.sfxGain;
    frequencies.forEach((frequency, index) => {
      this.tone({
        frequency,
        duration,
        delay: index * 0.045,
        volume,
        type,
        attack: 0.01,
        release: Math.max(0.06, duration * 0.65),
      }, sfxGain);
    });
  }

  private matchSparkle(big: boolean): void {
    if (!this.context || !this.sfxGain) {
      return;
    }

    const sfxGain = this.sfxGain;
    const notes = big ? [659.25, 830.61, 987.77, 1318.51] : [659.25, 783.99, 987.77];
    notes.forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: big ? 0.34 : 0.26,
        delay: index * 0.055,
        volume: big ? 0.07 : 0.06,
        type: "triangle",
        attack: 0.006,
        release: big ? 0.28 : 0.22,
      }, sfxGain);
    });

    this.tone({
      frequency: big ? 1760 : 1567.98,
      duration: 0.16,
      delay: 0.17,
      volume: big ? 0.045 : 0.038,
      type: "sine",
      attack: 0.004,
      release: 0.16,
    }, sfxGain);
    this.noise(big ? 0.22 : 0.16, big ? 0.035 : 0.026, 3600, sfxGain, 0.03);
  }

  private softNegative(): void {
    if (!this.context || !this.sfxGain) {
      return;
    }

    const sfxGain = this.sfxGain;
    this.tone({
      frequency: 246.94,
      duration: 0.11,
      volume: 0.025,
      type: "triangle",
      attack: 0.006,
      release: 0.08,
    }, sfxGain);
    this.tone({
      frequency: 196,
      duration: 0.13,
      delay: 0.055,
      volume: 0.02,
      type: "sine",
      attack: 0.006,
      release: 0.1,
    }, sfxGain);
    this.noise(0.08, 0.012, 420, sfxGain);
  }

  private tone(options: ToneOptions, destination: AudioNode): void {
    if (!this.context) {
      return;
    }

    const start = this.context.currentTime + (options.delay ?? 0);
    const duration = options.duration;
    const attack = options.attack ?? 0.015;
    const release = options.release ?? 0.08;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(options.frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, options.volume), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + release);

    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + release + 0.03);
  }

  private noise(
    duration: number,
    volume: number,
    cutoff: number,
    destination = this.sfxGain,
    delay = 0,
  ): void {
    if (!this.context || !destination) {
      return;
    }

    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }

    const start = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();

    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(start);
    source.stop(start + duration + 0.02);
  }
}

export const audioDirector = new AudioDirector();
