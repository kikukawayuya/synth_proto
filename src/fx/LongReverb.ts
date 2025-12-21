/**
 * Advanced Long Reverb with Convolver
 * 
 * High-quality reverb using ConvolverNode with programmatically generated
 * impulse response. Designed for drone/ambient music with long decay times.
 * 
 * Parameters:
 * - Decay Time: 1-30 seconds
 * - Pre-delay: 0-200ms
 * - Damping: 0-100% (high frequency rolloff)
 * - Dry/Wet: 0-100%
 * - Stereo Width: 0-100%
 */

export interface LongReverbParams {
    decayTime: number;    // 1-30 seconds
    preDelay: number;     // 0-200 ms
    damping: number;      // 0-1 (0=bright, 1=dark)
    dryWet: number;       // 0-1 (0=dry, 1=wet)
    stereoWidth: number;  // 0-1 (0=mono, 1=full stereo)
}

export class LongReverb {
    private ctx: AudioContext;
    private input: GainNode;
    private output: GainNode;

    // Signal chain
    private dryGain: GainNode;
    private wetGain: GainNode;
    private preDelayNode: DelayNode;
    private convolver: ConvolverNode;

    // Stereo processing
    private splitter: ChannelSplitterNode;
    private merger: ChannelMergerNode;
    private leftGain: GainNode;
    private rightGain: GainNode;

    // Current parameters
    private params: LongReverbParams = {
        decayTime: 8,
        preDelay: 20,
        damping: 0.3,
        dryWet: 0.3,
        stereoWidth: 0.8
    };

    // Enabled state
    private _enabled: boolean = true;

    // IR generation state
    private isGenerating: boolean = false;
    private irBuffer: AudioBuffer | null = null;

    constructor(ctx: AudioContext) {
        this.ctx = ctx;

        // Create nodes
        this.input = ctx.createGain();
        this.output = ctx.createGain();
        this.dryGain = ctx.createGain();
        this.wetGain = ctx.createGain();
        this.preDelayNode = ctx.createDelay(0.5);
        this.convolver = ctx.createConvolver();

        // Stereo processing nodes
        this.splitter = ctx.createChannelSplitter(2);
        this.merger = ctx.createChannelMerger(2);
        this.leftGain = ctx.createGain();
        this.rightGain = ctx.createGain();

        // Connect signal flow
        this.setupSignalFlow();

        // Generate initial IR
        this.generateIR();

        // Apply initial parameters
        this.updateMix();
    }

    private setupSignalFlow(): void {
        // Dry path: input → dryGain → output
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Wet path: input → preDelay → convolver → stereo processing → wetGain → output
        this.input.connect(this.preDelayNode);
        this.preDelayNode.connect(this.convolver);

        // Stereo width processing
        this.convolver.connect(this.splitter);
        this.splitter.connect(this.leftGain, 0);
        this.splitter.connect(this.rightGain, 1);
        this.leftGain.connect(this.merger, 0, 0);
        this.rightGain.connect(this.merger, 0, 1);

        this.merger.connect(this.wetGain);
        this.wetGain.connect(this.output);
    }

    /**
     * Generate impulse response programmatically
     */
    private async generateIR(): Promise<void> {
        if (this.isGenerating) return;
        this.isGenerating = true;

        const sampleRate = this.ctx.sampleRate;
        const duration = this.params.decayTime;
        const numSamples = Math.ceil(sampleRate * duration);

        // Create stereo buffer
        const buffer = this.ctx.createBuffer(2, numSamples, sampleRate);
        const leftChannel = buffer.getChannelData(0);
        const rightChannel = buffer.getChannelData(1);

        // Generate IR using exponential decay with damping
        await this.fillIRBuffer(leftChannel, rightChannel, numSamples, sampleRate);

        // Apply to convolver
        this.convolver.buffer = buffer;
        this.irBuffer = buffer;
        this.isGenerating = false;

        console.log(`IR generated: ${duration}s, ${numSamples} samples`);
    }

    /**
     * Fill IR buffer with noise and decay curve
     */
    private fillIRBuffer(
        left: Float32Array,
        right: Float32Array,
        numSamples: number,
        sampleRate: number
    ): Promise<void> {
        return new Promise((resolve) => {
            const decay = this.params.decayTime;
            const damping = this.params.damping;
            const stereoWidth = this.params.stereoWidth;

            // Decay coefficient: -60dB at decayTime
            const decayCoeff = Math.log(0.001) / decay;

            // Low-pass filter state for damping
            let lpStateL = 0;
            let lpStateR = 0;

            // Process in chunks to avoid blocking
            const chunkSize = 44100; // 1 second chunks
            let offset = 0;

            const processChunk = () => {
                const end = Math.min(offset + chunkSize, numSamples);

                for (let i = offset; i < end; i++) {
                    const t = i / sampleRate;

                    // Exponential decay envelope
                    const envelope = Math.exp(decayCoeff * t);

                    // White noise (different seeds for L/R)
                    const noiseL = (Math.random() * 2 - 1);
                    const noiseR = (Math.random() * 2 - 1);

                    // Time-varying low-pass filter for damping
                    // Higher damping = more filtering over time
                    const lpCoeff = 1 - damping * Math.min(1, t / decay);
                    const lpCutoff = 0.1 + 0.9 * lpCoeff; // Filter coefficient

                    // Simple one-pole low-pass filter
                    lpStateL = lpStateL + lpCutoff * (noiseL - lpStateL);
                    lpStateR = lpStateR + lpCutoff * (noiseR - lpStateR);

                    // Apply envelope
                    const sampleL = lpStateL * envelope;
                    const sampleR = lpStateR * envelope;

                    // Stereo width: mix L/R channels
                    const mid = (sampleL + sampleR) * 0.5;
                    const side = (sampleL - sampleR) * 0.5;

                    left[i] = mid + side * stereoWidth;
                    right[i] = mid - side * stereoWidth;
                }

                offset = end;

                if (offset < numSamples) {
                    // Continue processing
                    setTimeout(processChunk, 0);
                } else {
                    // Normalize the buffer
                    this.normalizeBuffer(left, right, numSamples);
                    resolve();
                }
            };

            processChunk();
        });
    }

    /**
     * Normalize IR buffer to prevent clipping
     */
    private normalizeBuffer(left: Float32Array, right: Float32Array, numSamples: number): void {
        let maxVal = 0;

        for (let i = 0; i < numSamples; i++) {
            maxVal = Math.max(maxVal, Math.abs(left[i]), Math.abs(right[i]));
        }

        if (maxVal > 0) {
            const normFactor = 0.7 / maxVal; // Leave some headroom
            for (let i = 0; i < numSamples; i++) {
                left[i] *= normFactor;
                right[i] *= normFactor;
            }
        }
    }

    /**
     * Update dry/wet mix
     */
    private updateMix(): void {
        const wet = this.params.dryWet;
        const dry = 1 - wet;

        const now = this.ctx.currentTime;
        this.dryGain.gain.setTargetAtTime(dry, now, 0.05);
        this.wetGain.gain.setTargetAtTime(wet, now, 0.05);
    }

    /**
     * Update pre-delay
     */
    private updatePreDelay(): void {
        const delaySeconds = this.params.preDelay / 1000;
        this.preDelayNode.delayTime.setTargetAtTime(delaySeconds, this.ctx.currentTime, 0.05);
    }

    /**
     * Update stereo width
     */
    private updateStereoWidth(): void {
        // This is applied during IR generation, but we can also
        // adjust the L/R balance for immediate effect
        const width = this.params.stereoWidth;
        const now = this.ctx.currentTime;

        // For immediate stereo width adjustment
        // More width = more separation between L/R
        this.leftGain.gain.setTargetAtTime(0.5 + width * 0.5, now, 0.05);
        this.rightGain.gain.setTargetAtTime(0.5 + width * 0.5, now, 0.05);
    }

    // ================== Public API ==================

    /**
     * Get input node for connecting audio sources
     */
    getInput(): GainNode {
        return this.input;
    }

    /**
     * Get output node for connecting to destination
     */
    getOutput(): GainNode {
        return this.output;
    }

    /**
     * Set decay time (1-30 seconds)
     * Note: This regenerates the IR, which may take a moment
     */
    setDecayTime(seconds: number): void {
        this.params.decayTime = Math.max(1, Math.min(30, seconds));
        this.generateIR();
    }

    /**
     * Set pre-delay (0-200 ms)
     */
    setPreDelay(ms: number): void {
        this.params.preDelay = Math.max(0, Math.min(200, ms));
        this.updatePreDelay();
    }

    /**
     * Set damping (0-1, higher = darker)
     * Note: This regenerates the IR
     */
    setDamping(value: number): void {
        this.params.damping = Math.max(0, Math.min(1, value));
        this.generateIR();
    }

    /**
     * Set dry/wet mix (0-1)
     */
    setDryWet(value: number): void {
        this.params.dryWet = Math.max(0, Math.min(1, value));
        this.updateMix();
    }

    /**
     * Set stereo width (0-1)
     */
    setStereoWidth(value: number): void {
        this.params.stereoWidth = Math.max(0, Math.min(1, value));
        this.updateStereoWidth();
        // Also regenerate IR for full effect
        this.generateIR();
    }

    /**
     * Set all parameters at once
     */
    setParams(params: Partial<LongReverbParams>): void {
        const needsRegen =
            params.decayTime !== undefined ||
            params.damping !== undefined ||
            params.stereoWidth !== undefined;

        if (params.decayTime !== undefined) {
            this.params.decayTime = Math.max(1, Math.min(30, params.decayTime));
        }
        if (params.preDelay !== undefined) {
            this.params.preDelay = Math.max(0, Math.min(200, params.preDelay));
        }
        if (params.damping !== undefined) {
            this.params.damping = Math.max(0, Math.min(1, params.damping));
        }
        if (params.dryWet !== undefined) {
            this.params.dryWet = Math.max(0, Math.min(1, params.dryWet));
        }
        if (params.stereoWidth !== undefined) {
            this.params.stereoWidth = Math.max(0, Math.min(1, params.stereoWidth));
        }

        this.updateMix();
        this.updatePreDelay();
        this.updateStereoWidth();

        if (needsRegen) {
            this.generateIR();
        }
    }

    /**
     * Get current parameters
     */
    getParams(): LongReverbParams {
        return { ...this.params };
    }

    /**
     * Get the current IR buffer for visualization
     */
    getIRBuffer(): AudioBuffer | null {
        return this.irBuffer;
    }

    /**
     * Connect input source
     */
    connect(source: AudioNode): void {
        source.connect(this.input);
    }

    /**
     * Connect to destination
     */
    connectTo(destination: AudioNode): void {
        this.output.connect(destination);
    }

    /**
     * Disconnect all
     */
    disconnect(): void {
        this.output.disconnect();
    }

    /**
     * Enable/disable reverb (bypass)
     */
    setEnabled(enabled: boolean): void {
        this._enabled = enabled;
        const now = this.ctx.currentTime;

        if (enabled) {
            // Apply current mix
            const wet = this.params.dryWet;
            this.dryGain.gain.setTargetAtTime(1 - wet, now, 0.05);
            this.wetGain.gain.setTargetAtTime(wet, now, 0.05);
        } else {
            // Full dry (bypass)
            this.dryGain.gain.setTargetAtTime(1, now, 0.05);
            this.wetGain.gain.setTargetAtTime(0, now, 0.05);
        }
    }

    /**
     * Check if reverb is enabled
     */
    isEnabled(): boolean {
        return this._enabled;
    }
}
