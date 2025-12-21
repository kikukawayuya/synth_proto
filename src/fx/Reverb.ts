/**
 * Algorithmic Reverb
 * Simple feedback delay network based reverb
 */

export class Reverb {
    private audioContext: AudioContext;
    private input: GainNode;
    private output: GainNode;
    private dryGain: GainNode;
    private wetGain: GainNode;
    private convolver: ConvolverNode;
    private preDelay: DelayNode;
    private lowCutFilter: BiquadFilterNode;
    private highCutFilter: BiquadFilterNode;

    private _decay: number = 4.0;
    private _mix: number = 0.25;
    private _lowCut: number = 300;

    constructor(audioContext: AudioContext) {
        this.audioContext = audioContext;

        // Create nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.dryGain = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.convolver = audioContext.createConvolver();
        this.preDelay = audioContext.createDelay(0.1);
        this.lowCutFilter = audioContext.createBiquadFilter();
        this.highCutFilter = audioContext.createBiquadFilter();

        // Pre-delay
        this.preDelay.delayTime.value = 0.02;

        // Filters
        this.lowCutFilter.type = 'highpass';
        this.lowCutFilter.frequency.value = this._lowCut;
        this.lowCutFilter.Q.value = 0.7;

        this.highCutFilter.type = 'lowpass';
        this.highCutFilter.frequency.value = 8000;
        this.highCutFilter.Q.value = 0.7;

        // Generate impulse response
        this.generateImpulse(this._decay);

        // Dry path
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Wet path
        this.input.connect(this.preDelay);
        this.preDelay.connect(this.lowCutFilter);
        this.lowCutFilter.connect(this.convolver);
        this.convolver.connect(this.highCutFilter);
        this.highCutFilter.connect(this.wetGain);
        this.wetGain.connect(this.output);

        // Set initial mix
        this.setMix(this._mix);
    }

    private generateImpulse(decay: number): void {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * decay;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);

            for (let i = 0; i < length; i++) {
                const t = i / sampleRate;

                // Exponential decay
                const amplitude = Math.exp(-t * 3 / decay);

                // Random noise
                const noise = Math.random() * 2 - 1;

                // Apply decay and add early reflections
                let sample = noise * amplitude;

                // Early reflections (simplified)
                if (i < sampleRate * 0.1) {
                    const earlyDecay = 1 - (i / (sampleRate * 0.1)) * 0.5;
                    sample *= earlyDecay;
                }

                channelData[i] = sample * 0.5;
            }
        }

        // Apply slight stereo decorrelation
        const rightChannel = impulse.getChannelData(1);
        const leftChannel = impulse.getChannelData(0);
        for (let i = 0; i < Math.min(500, length); i++) {
            const temp = rightChannel[i];
            rightChannel[i] = leftChannel[Math.min(i + 23, length - 1)] * 0.8 + temp * 0.2;
        }

        this.convolver.buffer = impulse;
    }

    getInput(): GainNode {
        return this.input;
    }

    getOutput(): GainNode {
        return this.output;
    }

    setDecay(decay: number): void {
        if (Math.abs(decay - this._decay) > 0.5) {
            this._decay = decay;
            this.generateImpulse(decay);
        }
    }

    setMix(mix: number): void {
        this._mix = mix;
        const now = this.audioContext.currentTime;
        this.dryGain.gain.setTargetAtTime(1 - mix * 0.5, now, 0.01);
        this.wetGain.gain.setTargetAtTime(mix, now, 0.01);
    }

    setLowCut(freq: number): void {
        this._lowCut = freq;
        const now = this.audioContext.currentTime;
        this.lowCutFilter.frequency.setTargetAtTime(freq, now, 0.01);
    }

    destroy(): void {
        this.input.disconnect();
        this.output.disconnect();
    }
}
