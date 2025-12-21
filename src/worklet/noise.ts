/**
 * Noise Generator
 * Pink and Brown noise using filtering
 */

export type NoiseType = 'off' | 'white' | 'pink' | 'brown';

export class NoiseGenerator {
    private noiseType: NoiseType = 'off';

    // Pink noise state (Voss algorithm)
    private pinkRows: number[] = new Array(16).fill(0);
    private pinkIndex: number = 0;
    private pinkRunningSum: number = 0;

    // Brown noise state
    private brownLastValue: number = 0;

    constructor() {
        // Initialize pink noise rows with random values
        for (let i = 0; i < 16; i++) {
            this.pinkRows[i] = Math.random() * 2 - 1;
            this.pinkRunningSum += this.pinkRows[i];
        }
    }

    setType(type: NoiseType): void {
        this.noiseType = type;
    }

    /**
     * Generate white noise sample
     */
    private white(): number {
        return Math.random() * 2 - 1;
    }

    /**
     * Generate pink noise sample (Voss-McCartney algorithm)
     * -3dB/octave roll-off
     */
    private pink(): number {
        const white = this.white();

        // Find lowest set bit position
        let k = this.pinkIndex;
        this.pinkIndex = (this.pinkIndex + 1) & 0xFFFF;

        // Update one random row per sample
        let numZeros = 0;
        while (k > 0 && (k & 1) === 0) {
            k >>= 1;
            numZeros++;
        }

        if (numZeros < 16) {
            // Subtract old value, add new
            this.pinkRunningSum -= this.pinkRows[numZeros];
            this.pinkRows[numZeros] = white;
            this.pinkRunningSum += white;
        }

        // Normalize and add white component
        return (this.pinkRunningSum / 16 + white) / 2;
    }

    /**
     * Generate brown (Brownian/red) noise sample
     * -6dB/octave roll-off
     */
    private brown(): number {
        const white = this.white();

        // Integrate white noise with leak
        this.brownLastValue = (this.brownLastValue + white * 0.02) / 1.02;

        // Scale to roughly unity
        return this.brownLastValue * 3.5;
    }

    /**
     * Get next sample
     */
    next(): number {
        switch (this.noiseType) {
            case 'white':
                return this.white();
            case 'pink':
                return this.pink();
            case 'brown':
                return this.brown();
            default:
                return 0;
        }
    }

    /**
     * Reset state
     */
    reset(): void {
        for (let i = 0; i < 16; i++) {
            this.pinkRows[i] = Math.random() * 2 - 1;
        }
        this.pinkRunningSum = this.pinkRows.reduce((a, b) => a + b, 0);
        this.pinkIndex = 0;
        this.brownLastValue = 0;
    }
}
