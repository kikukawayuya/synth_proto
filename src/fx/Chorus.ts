/**
 * Stereo Chorus Effect
 * Using modulated delay lines
 */

export class Chorus {
    private audioContext: AudioContext;
    private input: GainNode;
    private output: GainNode;
    private dryGain: GainNode;
    private wetGainL: GainNode;
    private wetGainR: GainNode;
    private delayL: DelayNode;
    private delayR: DelayNode;
    private lfoL: OscillatorNode;
    private lfoR: OscillatorNode;
    private lfoGainL: GainNode;
    private lfoGainR: GainNode;

    private _rate: number = 0.5;
    private _depth: number = 0.3;
    private _mix: number = 0.1;
    private _enabled: boolean = true;
    private bypassGain: GainNode | null = null;

    constructor(audioContext: AudioContext) {
        this.audioContext = audioContext;

        // Create nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.dryGain = audioContext.createGain();
        this.wetGainL = audioContext.createGain();
        this.wetGainR = audioContext.createGain();
        this.delayL = audioContext.createDelay(0.1);
        this.delayR = audioContext.createDelay(0.1);
        this.lfoL = audioContext.createOscillator();
        this.lfoR = audioContext.createOscillator();
        this.lfoGainL = audioContext.createGain();
        this.lfoGainR = audioContext.createGain();

        // Splitter/merger for stereo
        const splitter = audioContext.createChannelSplitter(2);
        const merger = audioContext.createChannelMerger(2);

        // Base delay time
        const baseDelay = 0.015; // 15ms base
        this.delayL.delayTime.value = baseDelay;
        this.delayR.delayTime.value = baseDelay;

        // LFO setup (slightly different frequencies for stereo width)
        this.lfoL.type = 'sine';
        this.lfoR.type = 'sine';
        this.lfoL.frequency.value = this._rate;
        this.lfoR.frequency.value = this._rate * 1.1; // Slight offset

        // LFO depth (modulates delay time)
        this.lfoGainL.gain.value = this._depth * 0.005;
        this.lfoGainR.gain.value = this._depth * 0.005;

        // Connect LFOs to delay modulation
        this.lfoL.connect(this.lfoGainL);
        this.lfoR.connect(this.lfoGainR);
        this.lfoGainL.connect(this.delayL.delayTime);
        this.lfoGainR.connect(this.delayR.delayTime);

        // Dry path
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Wet path
        this.input.connect(splitter);
        splitter.connect(this.delayL, 0);
        splitter.connect(this.delayR, 1);
        this.delayL.connect(this.wetGainL);
        this.delayR.connect(this.wetGainR);
        this.wetGainL.connect(merger, 0, 0);
        this.wetGainR.connect(merger, 0, 1);
        merger.connect(this.output);

        // Start LFOs
        this.lfoL.start();
        this.lfoR.start();

        // Set initial mix
        this.setMix(this._mix);
    }

    getInput(): GainNode {
        return this.input;
    }

    getOutput(): GainNode {
        return this.output;
    }

    setRate(rate: number): void {
        this._rate = rate;
        const now = this.audioContext.currentTime;
        this.lfoL.frequency.setTargetAtTime(rate, now, 0.01);
        this.lfoR.frequency.setTargetAtTime(rate * 1.1, now, 0.01);
    }

    setDepth(depth: number): void {
        this._depth = depth;
        const now = this.audioContext.currentTime;
        this.lfoGainL.gain.setTargetAtTime(depth * 0.005, now, 0.01);
        this.lfoGainR.gain.setTargetAtTime(depth * 0.005, now, 0.01);
    }

    setMix(mix: number): void {
        this._mix = mix;
        if (!this._enabled) return; // Don't apply when disabled
        const now = this.audioContext.currentTime;
        this.dryGain.gain.setTargetAtTime(1 - mix, now, 0.01);
        this.wetGainL.gain.setTargetAtTime(mix, now, 0.01);
        this.wetGainR.gain.setTargetAtTime(mix, now, 0.01);
    }

    setEnabled(enabled: boolean): void {
        this._enabled = enabled;
        const now = this.audioContext.currentTime;
        if (enabled) {
            // Apply current mix
            this.dryGain.gain.setTargetAtTime(1 - this._mix, now, 0.01);
            this.wetGainL.gain.setTargetAtTime(this._mix, now, 0.01);
            this.wetGainR.gain.setTargetAtTime(this._mix, now, 0.01);
        } else {
            // Full dry (bypass)
            this.dryGain.gain.setTargetAtTime(1, now, 0.01);
            this.wetGainL.gain.setTargetAtTime(0, now, 0.01);
            this.wetGainR.gain.setTargetAtTime(0, now, 0.01);
        }
    }

    isEnabled(): boolean {
        return this._enabled;
    }

    destroy(): void {
        this.lfoL.stop();
        this.lfoR.stop();
        this.lfoL.disconnect();
        this.lfoR.disconnect();
        this.input.disconnect();
        this.output.disconnect();
    }
}
