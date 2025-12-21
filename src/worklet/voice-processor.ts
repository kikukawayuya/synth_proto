/**
 * Voice Processor - AudioWorklet for single voice DSP
 * Combines: 3 Oscillators + Noise → Mixer → Filter → Amp
 */

import { Oscillator, WaveType } from './oscillator';
import { Envelope } from './envelope';
import { LadderFilter, FilterType } from './filter';
import { LFO, LFOWaveType } from './lfo';
import { NoiseGenerator, NoiseType } from './noise';

interface VoiceParams {
    // Oscillators
    osc1Wave: WaveType;
    osc1Level: number;
    osc1Detune: number;
    osc1Octave: number;
    osc2Wave: WaveType;
    osc2Level: number;
    osc2Detune: number;
    osc2Octave: number;
    osc3Wave: WaveType;
    osc3Level: number;
    osc3Detune: number;
    osc3Octave: number;

    // Noise
    noiseType: NoiseType;
    noiseLevel: number;

    // Filter
    filterType: FilterType;
    filterCutoff: number;
    filterRes: number;
    filterEnvAmount: number;
    filterKeyTrack: number;

    // Amp Envelope
    ampAttack: number;
    ampDecay: number;
    ampSustain: number;
    ampRelease: number;

    // Filter Envelope
    filterAttack: number;
    filterDecay: number;
    filterSustain: number;
    filterRelease: number;

    // LFOs
    lfo1Wave: LFOWaveType;
    lfo1Rate: number;
    lfo1Amount: number;
    lfo1Target: string;
    lfo2Wave: LFOWaveType;
    lfo2Rate: number;
    lfo2Amount: number;
    lfo2Target: string;

    // Voice
    velocity: number;
    pan: number;
}

interface NoteMessage {
    type: 'noteOn' | 'noteOff';
    note: number;
    velocity: number;
}

interface ParamMessage {
    type: 'param';
    name: string;
    value: number | string;
}

type VoiceMessage = NoteMessage | ParamMessage;

class VoiceProcessor extends AudioWorkletProcessor {
    private osc1: Oscillator;
    private osc2: Oscillator;
    private osc3: Oscillator;
    private noise: NoiseGenerator;
    private filter: LadderFilter;
    private ampEnv: Envelope;
    private filterEnv: Envelope;
    private lfo1: LFO;
    private lfo2: LFO;

    private params: VoiceParams;
    private note: number = 60;
    private velocity: number = 0;
    private isActive: boolean = false;

    // Smoothing for click prevention
    private smoothedPan: number = 0;
    private smoothingCoeff: number = 0.999;

    constructor() {
        super();

        const sampleRate = 44100; // Will be overwritten

        this.osc1 = new Oscillator(sampleRate);
        this.osc2 = new Oscillator(sampleRate);
        this.osc3 = new Oscillator(sampleRate);
        this.noise = new NoiseGenerator();
        this.filter = new LadderFilter(sampleRate);
        this.ampEnv = new Envelope(sampleRate);
        this.filterEnv = new Envelope(sampleRate);
        this.lfo1 = new LFO(sampleRate);
        this.lfo2 = new LFO(sampleRate);

        // Default params (Purity-like)
        this.params = {
            osc1Wave: 'sine',
            osc1Level: 1.0,
            osc1Detune: 0,
            osc1Octave: 0,
            osc2Wave: 'sine',
            osc2Level: 0.7,
            osc2Detune: 3,
            osc2Octave: 0,
            osc3Wave: 'sine',
            osc3Level: 0.4,
            osc3Detune: -3,
            osc3Octave: 0,
            noiseType: 'off',
            noiseLevel: 0,
            filterType: 'lp24',
            filterCutoff: 2000,
            filterRes: 0.1,
            filterEnvAmount: 0.2,
            filterKeyTrack: 0.5,
            ampAttack: 2.5,
            ampDecay: 1.0,
            ampSustain: 0.85,
            ampRelease: 6.0,
            filterAttack: 0.5,
            filterDecay: 2.0,
            filterSustain: 0.3,
            filterRelease: 4.0,
            lfo1Wave: 'sine',
            lfo1Rate: 0.03,
            lfo1Amount: 0.15,
            lfo1Target: 'pan',
            lfo2Wave: 'sine',
            lfo2Rate: 1.0,
            lfo2Amount: 0,
            lfo2Target: 'filter',
            velocity: 1.0,
            pan: 0
        };

        this.applyParams();

        this.port.onmessage = (e: MessageEvent<VoiceMessage>) => {
            this.handleMessage(e.data);
        };
    }

    private handleMessage(msg: VoiceMessage): void {
        switch (msg.type) {
            case 'noteOn':
                this.noteOn(msg.note, msg.velocity);
                break;
            case 'noteOff':
                this.noteOff();
                break;
            case 'param':
                this.setParam(msg.name, msg.value);
                break;
        }
    }

    private noteOn(note: number, velocity: number): void {
        this.note = note;
        this.velocity = velocity / 127;
        this.isActive = true;

        const freq = this.midiToFreq(note);
        this.updateOscFrequencies(freq);

        // Key tracking for filter
        const keyTrack = (note - 60) / 60 * this.params.filterKeyTrack;
        const baseCutoff = this.params.filterCutoff * Math.pow(2, keyTrack);
        this.filter.setCutoff(baseCutoff);

        this.ampEnv.trigger();
        this.filterEnv.trigger();

        // Reset oscillators for consistent phase
        this.osc1.reset();
        this.osc2.reset();
        this.osc3.reset();
    }

    private noteOff(): void {
        this.ampEnv.release_();
        this.filterEnv.release_();
    }

    private setParam(name: string, value: number | string): void {
        (this.params as any)[name] = value;
        this.applyParams();
    }

    private applyParams(): void {
        // Oscillators
        this.osc1.setWaveType(this.params.osc1Wave);
        this.osc2.setWaveType(this.params.osc2Wave);
        this.osc3.setWaveType(this.params.osc3Wave);

        // Noise
        this.noise.setType(this.params.noiseType);

        // Filter
        this.filter.setType(this.params.filterType);
        this.filter.setCutoff(this.params.filterCutoff);
        this.filter.setResonance(this.params.filterRes);

        // Envelopes
        this.ampEnv.setParams({
            attack: this.params.ampAttack,
            decay: this.params.ampDecay,
            sustain: this.params.ampSustain,
            release: this.params.ampRelease
        });

        this.filterEnv.setParams({
            attack: this.params.filterAttack,
            decay: this.params.filterDecay,
            sustain: this.params.filterSustain,
            release: this.params.filterRelease
        });

        // LFOs
        this.lfo1.setWaveType(this.params.lfo1Wave);
        this.lfo1.setRate(this.params.lfo1Rate);
        this.lfo2.setWaveType(this.params.lfo2Wave);
        this.lfo2.setRate(this.params.lfo2Rate);
    }

    private midiToFreq(note: number): number {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    private updateOscFrequencies(baseFreq: number): void {
        const osc1Freq = baseFreq * Math.pow(2, this.params.osc1Octave) *
            Math.pow(2, this.params.osc1Detune / 1200);
        const osc2Freq = baseFreq * Math.pow(2, this.params.osc2Octave) *
            Math.pow(2, this.params.osc2Detune / 1200);
        const osc3Freq = baseFreq * Math.pow(2, this.params.osc3Octave) *
            Math.pow(2, this.params.osc3Detune / 1200);

        this.osc1.setFrequency(osc1Freq);
        this.osc2.setFrequency(osc2Freq);
        this.osc3.setFrequency(osc3Freq);
    }

    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean {
        const output = outputs[0];
        const outputL = output[0];
        const outputR = output[1];

        if (!outputL || !outputR) return true;

        const blockSize = outputL.length;

        // Check if voice should remain active
        if (!this.isActive && this.ampEnv.isFinished()) {
            outputL.fill(0);
            outputR.fill(0);
            return true;
        }

        for (let i = 0; i < blockSize; i++) {
            // Get LFO values
            const lfo1Val = this.lfo1.next();
            const lfo2Val = this.lfo2.next();

            // Apply LFO modulation
            let pitchMod = 0;
            let filterMod = 0;
            let panMod = 0;

            // LFO1 routing
            if (this.params.lfo1Target === 'pitch') {
                pitchMod += lfo1Val * this.params.lfo1Amount * 100; // cents
            } else if (this.params.lfo1Target === 'filter') {
                filterMod += lfo1Val * this.params.lfo1Amount;
            } else if (this.params.lfo1Target === 'pan') {
                panMod += lfo1Val * this.params.lfo1Amount;
            }

            // LFO2 routing
            if (this.params.lfo2Target === 'pitch') {
                pitchMod += lfo2Val * this.params.lfo2Amount * 100;
            } else if (this.params.lfo2Target === 'filter') {
                filterMod += lfo2Val * this.params.lfo2Amount;
            } else if (this.params.lfo2Target === 'pan') {
                panMod += lfo2Val * this.params.lfo2Amount;
            }

            // Update oscillator frequencies with pitch mod
            if (pitchMod !== 0) {
                const baseFreq = this.midiToFreq(this.note);
                const modMult = Math.pow(2, pitchMod / 1200);
                this.osc1.setFrequency(baseFreq * Math.pow(2, this.params.osc1Octave) *
                    Math.pow(2, this.params.osc1Detune / 1200) * modMult);
                this.osc2.setFrequency(baseFreq * Math.pow(2, this.params.osc2Octave) *
                    Math.pow(2, this.params.osc2Detune / 1200) * modMult);
                this.osc3.setFrequency(baseFreq * Math.pow(2, this.params.osc3Octave) *
                    Math.pow(2, this.params.osc3Detune / 1200) * modMult);
            }

            // Generate oscillators
            let osc1 = this.osc1.next() * this.params.osc1Level;
            let osc2 = this.osc2.next() * this.params.osc2Level;
            let osc3 = this.osc3.next() * this.params.osc3Level;
            let noiseSample = this.noise.next() * this.params.noiseLevel;

            // Mix oscillators
            let mixed = (osc1 + osc2 + osc3 + noiseSample) * 0.3;

            // Filter envelope modulation
            const filterEnvVal = this.filterEnv.next();
            const envCutoffMod = filterEnvVal * this.params.filterEnvAmount * 10000;
            const lfo1CutoffMod = filterMod * 5000;
            this.filter.setCutoff(this.params.filterCutoff + envCutoffMod + lfo1CutoffMod);

            // Apply filter
            let filtered = this.filter.process(mixed);

            // Apply amp envelope
            const ampEnvVal = this.ampEnv.next();
            let amped = filtered * ampEnvVal * this.velocity;

            // Pan calculation with smoothing
            const targetPan = Math.max(-1, Math.min(1, this.params.pan + panMod));
            this.smoothedPan = this.smoothedPan * this.smoothingCoeff +
                targetPan * (1 - this.smoothingCoeff);

            // Constant power panning
            const panAngle = (this.smoothedPan + 1) * Math.PI / 4;
            const leftGain = Math.cos(panAngle);
            const rightGain = Math.sin(panAngle);

            outputL[i] = amped * leftGain;
            outputR[i] = amped * rightGain;
        }

        // Mark inactive if envelope finished
        if (this.ampEnv.isFinished()) {
            this.isActive = false;
        }

        return true;
    }
}

registerProcessor('voice-processor', VoiceProcessor);
