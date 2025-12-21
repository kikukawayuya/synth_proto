/**
 * PolyBLEP Oscillator
 * Band-limited oscillator using polynomial BLEP for anti-aliasing
 */

export type WaveType = 'sine' | 'triangle' | 'saw' | 'square';

export class Oscillator {
    private phase: number = 0;
    private sampleRate: number;
    private frequency: number = 440;
    private waveType: WaveType = 'sine';

    constructor(sampleRate: number) {
        this.sampleRate = sampleRate;
    }

    setFrequency(freq: number): void {
        this.frequency = Math.max(0.01, Math.min(freq, this.sampleRate / 2));
    }

    setWaveType(type: WaveType): void {
        this.waveType = type;
    }

    /**
     * PolyBLEP correction for anti-aliasing
     * Reduces aliasing at wave transitions
     */
    private polyBlep(t: number, dt: number): number {
        // t = phase / (2 * PI), dt = freq / sampleRate
        if (t < dt) {
            const x = t / dt;
            return x + x - x * x - 1;
        } else if (t > 1 - dt) {
            const x = (t - 1) / dt;
            return x * x + x + x + 1;
        }
        return 0;
    }

    /**
     * Generate next sample
     */
    next(): number {
        const dt = this.frequency / this.sampleRate;
        let sample = 0;

        switch (this.waveType) {
            case 'sine':
                sample = Math.sin(this.phase * 2 * Math.PI);
                break;

            case 'saw':
                // Naive saw: 2 * phase - 1
                sample = 2 * this.phase - 1;
                // Apply PolyBLEP at discontinuity
                sample -= this.polyBlep(this.phase, dt);
                break;

            case 'square':
                // Naive square
                sample = this.phase < 0.5 ? 1 : -1;
                // Apply PolyBLEP at both edges
                sample += this.polyBlep(this.phase, dt);
                sample -= this.polyBlep((this.phase + 0.5) % 1, dt);
                break;

            case 'triangle':
                // Integrate square wave to get triangle
                // First generate square, then integrate
                const sq = this.phase < 0.5 ? 1 : -1;
                // Triangle from saw
                sample = 2 * Math.abs(2 * this.phase - 1) - 1;
                // Softer anti-aliasing for triangle
                const blepCorrection = this.polyBlep(this.phase, dt) - this.polyBlep((this.phase + 0.5) % 1, dt);
                sample += blepCorrection * dt * 4;
                break;
        }

        // Advance phase
        this.phase += dt;
        if (this.phase >= 1) {
            this.phase -= 1;
        }

        return sample;
    }

    /**
     * Reset phase (for sync etc)
     */
    reset(): void {
        this.phase = 0;
    }
}
