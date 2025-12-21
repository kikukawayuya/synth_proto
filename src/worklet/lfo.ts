/**
 * LFO (Low Frequency Oscillator)
 * Includes Sample & Hold for random modulation
 */

export type LFOWaveType = 'sine' | 'triangle' | 'saw' | 'square' | 'sh';

export class LFO {
    private sampleRate: number;
    private phase: number = 0;
    private rate: number = 1; // Hz
    private waveType: LFOWaveType = 'sine';

    // Sample & Hold state
    private shValue: number = 0;
    private shPhase: number = 0;

    constructor(sampleRate: number) {
        this.sampleRate = sampleRate;
    }

    setRate(rate: number): void {
        this.rate = Math.max(0.001, Math.min(rate, 100));
    }

    setWaveType(type: LFOWaveType): void {
        this.waveType = type;
    }

    /**
     * Get next sample (bipolar: -1 to 1)
     */
    next(): number {
        const dt = this.rate / this.sampleRate;
        let value = 0;

        switch (this.waveType) {
            case 'sine':
                value = Math.sin(this.phase * 2 * Math.PI);
                break;

            case 'triangle':
                // Triangle from phase
                value = 2 * Math.abs(2 * this.phase - 1) - 1;
                break;

            case 'saw':
                // Saw up
                value = 2 * this.phase - 1;
                break;

            case 'square':
                value = this.phase < 0.5 ? 1 : -1;
                break;

            case 'sh':
                // Sample & Hold: new random value at each cycle
                if (this.phase < this.shPhase) {
                    // Phase wrapped, get new value
                    this.shValue = Math.random() * 2 - 1;
                }
                this.shPhase = this.phase;
                value = this.shValue;
                break;
        }

        // Advance phase
        this.phase += dt;
        if (this.phase >= 1) {
            this.phase -= 1;
        }

        return value;
    }

    /**
     * Get unipolar output (0 to 1)
     */
    nextUnipolar(): number {
        return (this.next() + 1) * 0.5;
    }

    /**
     * Reset phase
     */
    reset(): void {
        this.phase = 0;
        this.shValue = Math.random() * 2 - 1;
        this.shPhase = 0;
    }
}
