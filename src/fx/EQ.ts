/**
 * Simple EQ
 * High-pass and Low-shelf filters
 */

export class EQ {
    private audioContext: AudioContext;
    private input: GainNode;
    private output: GainNode;
    private highPass: BiquadFilterNode;
    private lowShelf: BiquadFilterNode;
    private highShelf: BiquadFilterNode;

    constructor(audioContext: AudioContext) {
        this.audioContext = audioContext;

        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        this.highPass = audioContext.createBiquadFilter();
        this.highPass.type = 'highpass';
        this.highPass.frequency.value = 20;
        this.highPass.Q.value = 0.7;

        this.lowShelf = audioContext.createBiquadFilter();
        this.lowShelf.type = 'lowshelf';
        this.lowShelf.frequency.value = 200;
        this.lowShelf.gain.value = 0;

        this.highShelf = audioContext.createBiquadFilter();
        this.highShelf.type = 'highshelf';
        this.highShelf.frequency.value = 8000;
        this.highShelf.gain.value = 0;

        // Connect
        this.input.connect(this.highPass);
        this.highPass.connect(this.lowShelf);
        this.lowShelf.connect(this.highShelf);
        this.highShelf.connect(this.output);
    }

    getInput(): GainNode {
        return this.input;
    }

    getOutput(): GainNode {
        return this.output;
    }

    setHighPassFreq(freq: number): void {
        const now = this.audioContext.currentTime;
        this.highPass.frequency.setTargetAtTime(freq, now, 0.01);
    }

    setLowShelfGain(gain: number): void {
        const now = this.audioContext.currentTime;
        this.lowShelf.gain.setTargetAtTime(gain, now, 0.01);
    }

    setHighShelfGain(gain: number): void {
        const now = this.audioContext.currentTime;
        this.highShelf.gain.setTargetAtTime(gain, now, 0.01);
    }

    destroy(): void {
        this.input.disconnect();
        this.output.disconnect();
    }
}
