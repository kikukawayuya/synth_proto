/**
 * 24dB/oct Ladder Filter (Moog-style approximation)
 * With resonance, drive, and key tracking
 */

export type FilterType = 'lp24' | 'lp12' | 'bp' | 'hp';

export class LadderFilter {
    private sampleRate: number;

    // Filter state (4 stages for 24dB)
    private stage: number[] = [0, 0, 0, 0];
    private stageTemp: number[] = [0, 0, 0, 0];

    // Parameters
    private cutoff: number = 1000;
    private resonance: number = 0;
    private drive: number = 1;
    private filterType: FilterType = 'lp24';

    // Smoothed parameters
    private smoothedCutoff: number = 1000;
    private smoothingCoeff: number = 0.999;

    // Derived values
    private g: number = 0;
    private k: number = 0;

    constructor(sampleRate: number) {
        this.sampleRate = sampleRate;
        this.updateCoefficients();
    }

    setCutoff(freq: number): void {
        this.cutoff = Math.max(20, Math.min(freq, this.sampleRate * 0.49));
    }

    setResonance(res: number): void {
        // Resonance 0-1, maps to 0-4 for self-oscillation at max
        this.resonance = Math.max(0, Math.min(res, 1));
        this.k = this.resonance * 4;
    }

    setDrive(drive: number): void {
        this.drive = Math.max(0.1, Math.min(drive, 5));
    }

    setType(type: FilterType): void {
        this.filterType = type;
    }

    private updateCoefficients(): void {
        // Compute g (feedback coefficient) from cutoff
        // Using a simplified Stilson/Smith Moog ladder approximation
        const fc = this.smoothedCutoff / this.sampleRate;
        const fcClamped = Math.min(fc, 0.49);

        // Attempt to compensate frequency warping
        this.g = Math.tan(Math.PI * fcClamped);

        // Normalize resonance
        this.k = this.resonance * 4;
    }

    /**
     * Soft clipping for drive/saturation
     */
    private softClip(x: number): number {
        // Tanh-like soft clipping
        if (x > 1) return 1 - 1 / (x * x + 1);
        if (x < -1) return -1 + 1 / (x * x + 1);
        return x - (x * x * x) / 3;
    }

    /**
     * Process single sample through ladder
     */
    process(input: number): number {
        // Smooth cutoff changes
        this.smoothedCutoff = this.smoothedCutoff * this.smoothingCoeff +
            this.cutoff * (1 - this.smoothingCoeff);
        this.updateCoefficients();

        // Apply input drive
        let x = input * this.drive;

        // Feedback from output (resonance)
        const feedback = this.stage[3] * this.k;
        x = x - feedback;

        // Soft clip at input (prevent runaway)
        x = this.softClip(x);

        // Calculate G for the cascade
        const G = this.g / (1 + this.g);

        // Process through 4 one-pole filters
        for (let i = 0; i < 4; i++) {
            const prevStage = i === 0 ? x : this.stage[i - 1];

            // One-pole lowpass: y = g * x + (1-g) * y_prev
            // Or equivalently: y = y_prev + g * (x - y_prev)
            const v = G * (prevStage - this.stage[i]);
            const y = this.stage[i] + v;
            this.stage[i] = y + v; // Double sample (more accurate)
        }

        // Select output based on filter type
        let output: number;

        switch (this.filterType) {
            case 'lp24':
                // 24dB/oct lowpass (4th stage output)
                output = this.stage[3];
                break;

            case 'lp12':
                // 12dB/oct lowpass (2nd stage output)
                output = this.stage[1];
                break;

            case 'bp':
                // Bandpass (difference of stages)
                output = this.stage[1] - this.stage[3];
                break;

            case 'hp':
                // Highpass (input minus lowpass)
                output = input - this.stage[3];
                break;

            default:
                output = this.stage[3];
        }

        // Light output saturation
        return this.softClip(output);
    }

    /**
     * Reset filter state
     */
    reset(): void {
        this.stage.fill(0);
        this.smoothedCutoff = this.cutoff;
    }
}
