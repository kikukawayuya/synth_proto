/**
 * ADSR Envelope Generator
 * With exponential curves and smoothing
 */

export type EnvelopeStage = 'idle' | 'attack' | 'decay' | 'sustain' | 'release';

export interface EnvelopeParams {
    attack: number;   // seconds
    decay: number;    // seconds
    sustain: number;  // 0-1
    release: number;  // seconds
}

export class Envelope {
    private sampleRate: number;
    private stage: EnvelopeStage = 'idle';
    private value: number = 0;
    private targetValue: number = 0;

    // Parameters
    private attack: number = 0.01;
    private decay: number = 0.1;
    private sustain: number = 0.7;
    private release: number = 0.3;

    // Coefficients for exponential curves
    private attackCoeff: number = 0;
    private decayCoeff: number = 0;
    private releaseCoeff: number = 0;

    // Smoothing
    private smoothedValue: number = 0;
    private smoothingCoeff: number = 0.995;

    constructor(sampleRate: number) {
        this.sampleRate = sampleRate;
        this.updateCoefficients();
    }

    setParams(params: Partial<EnvelopeParams>): void {
        if (params.attack !== undefined) this.attack = Math.max(0.001, params.attack);
        if (params.decay !== undefined) this.decay = Math.max(0.001, params.decay);
        if (params.sustain !== undefined) this.sustain = Math.max(0, Math.min(1, params.sustain));
        if (params.release !== undefined) this.release = Math.max(0.001, params.release);
        this.updateCoefficients();
    }

    private updateCoefficients(): void {
        // Time constant for exponential decay
        // Coefficient = exp(-1 / (time * sampleRate))
        // Lower values = faster response
        const timeConstantMultiplier = 3; // Adjust for perceived time

        this.attackCoeff = Math.exp(-1 / (this.attack * this.sampleRate * timeConstantMultiplier));
        this.decayCoeff = Math.exp(-1 / (this.decay * this.sampleRate * timeConstantMultiplier));
        this.releaseCoeff = Math.exp(-1 / (this.release * this.sampleRate * timeConstantMultiplier));
    }

    /**
     * Trigger note on
     */
    trigger(): void {
        this.stage = 'attack';
        this.targetValue = 1.0;
    }

    /**
     * Trigger note off
     */
    release_(): void {
        if (this.stage !== 'idle') {
            this.stage = 'release';
            this.targetValue = 0;
        }
    }

    /**
     * Force reset
     */
    reset(): void {
        this.stage = 'idle';
        this.value = 0;
        this.smoothedValue = 0;
        this.targetValue = 0;
    }

    /**
     * Check if envelope is finished
     */
    isFinished(): boolean {
        return this.stage === 'idle' && this.value < 0.0001;
    }

    /**
     * Get current stage
     */
    getStage(): EnvelopeStage {
        return this.stage;
    }

    /**
     * Process next sample
     */
    next(): number {
        const epsilon = 0.0001;

        switch (this.stage) {
            case 'idle':
                this.value = 0;
                break;

            case 'attack':
                // Exponential approach to target (slightly above 1 for overshoot compensation)
                this.value = this.targetValue - (this.targetValue - this.value) * this.attackCoeff;

                if (this.value >= 0.999) {
                    this.value = 1.0;
                    this.stage = 'decay';
                    this.targetValue = this.sustain;
                }
                break;

            case 'decay':
                this.value = this.targetValue + (this.value - this.targetValue) * this.decayCoeff;

                if (Math.abs(this.value - this.sustain) < epsilon) {
                    this.value = this.sustain;
                    this.stage = 'sustain';
                }
                break;

            case 'sustain':
                this.value = this.sustain;
                break;

            case 'release':
                this.value = this.value * this.releaseCoeff;

                if (this.value < epsilon) {
                    this.value = 0;
                    this.stage = 'idle';
                }
                break;
        }

        // Apply smoothing to prevent clicks
        this.smoothedValue = this.smoothedValue * this.smoothingCoeff +
            this.value * (1 - this.smoothingCoeff);

        return this.smoothedValue;
    }
}
