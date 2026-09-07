import { Injectable } from '@angular/core';
import { AppSettingsService } from './app-settings.service';

interface Tone {
  freq: number;
  duration: number;
  delay: number;
  type?: OscillatorType;
}

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private audioContext: AudioContext | null = null;

  constructor(private appSettingsService: AppSettingsService) {}

  playCorrect(): void {
    if (!this.appSettingsService.getSoundEnabled()) {
      return;
    }
    this.playTones([
      { freq: 880, duration: 0.12, delay: 0 },
      { freq: 1175, duration: 0.18, delay: 0.12 },
    ]);
  }

  playIncorrect(): void {
    if (!this.appSettingsService.getSoundEnabled()) {
      return;
    }
    this.playTones([
      { freq: 220, duration: 0.25, delay: 0, type: 'sawtooth' },
    ]);
  }

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  private playTones(tones: Tone[]): void {
    const ctx = this.getContext();
    tones.forEach(tone => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = tone.type ?? 'sine';
      oscillator.frequency.value = tone.freq;
      const startTime = ctx.currentTime + tone.delay;
      const endTime = startTime + tone.duration;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  }
}
