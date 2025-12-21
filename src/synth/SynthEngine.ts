/**
 * Synth Engine - Main Thread Controller
 * Manages voices, effects, and parameter routing
 */

import { Chorus } from '../fx/Chorus';
import { Reverb } from '../fx/Reverb';
import { LongReverb, LongReverbParams } from '../fx/LongReverb';
import { EQ } from '../fx/EQ';
import { Preset, presetToParams, ES2_PURITY_PRESET } from './Preset';

interface Voice {
    node: AudioWorkletNode;
    note: number;
    startTime: number;
    active: boolean;
}

export class SynthEngine {
    private audioContext: AudioContext | null = null;
    private voices: Map<number, Voice> = new Map();
    private voicePool: Voice[] = [];
    private maxVoices: number = 12;

    // Audio nodes
    private masterGain: GainNode | null = null;
    private voiceMixer: GainNode | null = null;
    private analyser: AnalyserNode | null = null;

    // Effects
    private chorus: Chorus | null = null;
    private reverb: Reverb | null = null;
    private longReverb: LongReverb | null = null;
    private eq: EQ | null = null;

    // Current parameters
    private currentParams: Record<string, any> = {};
    private currentPreset: Preset = ES2_PURITY_PRESET;

    // State
    private initialized: boolean = false;

    async init(): Promise<void> {
        if (this.initialized) return;

        this.audioContext = new AudioContext();

        // Create master chain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.7;

        this.voiceMixer = this.audioContext.createGain();
        this.voiceMixer.gain.value = 1.0;

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;

        // Create effects
        this.eq = new EQ(this.audioContext);
        this.chorus = new Chorus(this.audioContext);
        this.reverb = new Reverb(this.audioContext);
        this.longReverb = new LongReverb(this.audioContext);

        // Connect: voices -> EQ -> Chorus -> LongReverb -> Master -> Analyser -> Destination
        this.voiceMixer.connect(this.eq.getInput());
        this.eq.getOutput().connect(this.chorus.getInput());
        this.chorus.getOutput().connect(this.longReverb.getInput());
        this.longReverb.getOutput().connect(this.masterGain);
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        // Load the AudioWorklet module
        // Note: We need to bundle the worklet separately
        try {
            await this.audioContext.audioWorklet.addModule('/src/worklet/voice-processor-bundle.js');
        } catch (e) {
            console.warn('AudioWorklet failed, using fallback...', e);
            // Fallback will be native oscillators
        }

        // Apply default preset
        this.loadPreset(this.currentPreset);

        this.initialized = true;
        console.log('SynthEngine initialized');
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    getAudioContext(): AudioContext | null {
        return this.audioContext;
    }

    getAnalyser(): AnalyserNode | null {
        return this.analyser;
    }

    /**
     * Note On - trigger a voice
     */
    noteOn(note: number, velocity: number = 100): void {
        if (!this.audioContext || !this.voiceMixer) return;

        // Check if note already playing
        if (this.voices.has(note)) {
            this.noteOff(note);
        }

        // Create voice using fallback (native oscillators) since AudioWorklet bundling is complex
        const voice = this.createFallbackVoice(note, velocity);
        if (voice) {
            this.voices.set(note, voice);
        }
    }

    /**
     * Note Off - release a voice
     */
    noteOff(note: number): void {
        const voice = this.voices.get(note);
        if (voice && voice.active) {
            voice.active = false;

            // Trigger release
            if (voice.node) {
                try {
                    voice.node.port.postMessage({ type: 'noteOff' });
                } catch (e) {
                    // Fallback voice cleanup
                    this.cleanupFallbackVoice(voice, note);
                }
            }
        }
    }

    /**
     * Create fallback voice using native Web Audio nodes
     * This is simpler and more reliable than AudioWorklet for demo
     */
    private createFallbackVoice(note: number, velocity: number): Voice | null {
        if (!this.audioContext || !this.voiceMixer) return null;

        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const freq = 440 * Math.pow(2, (note - 69) / 12);
        const vel = velocity / 127;

        const params = this.currentParams;

        // Create oscillators
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc3.type = 'sine';

        // Frequencies with detune
        const osc1Detune = params.osc1Detune || -9;
        const osc2Detune = params.osc2Detune || -1;
        const osc3Detune = params.osc3Detune || 10;
        const osc2Semitone = params.osc2Semitone || 12;

        osc1.frequency.value = freq * Math.pow(2, osc1Detune / 1200);
        osc2.frequency.value = freq * Math.pow(2, (osc2Semitone * 100 + osc2Detune) / 1200);
        osc3.frequency.value = freq * Math.pow(2, osc3Detune / 1200);

        // Gains
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();
        const gain3 = ctx.createGain();

        gain1.gain.value = params.osc1Level || 1.0;
        gain2.gain.value = params.osc2Level || 0.8;
        gain3.gain.value = params.osc3Level || 0.55;

        // Mixer
        const mixer = ctx.createGain();
        mixer.gain.value = 0.25;

        // Filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        const baseCutoff = params.filterCutoff || 800;
        filter.frequency.value = baseCutoff;
        filter.Q.value = (params.filterRes || 0.12) * 20;

        // Amp envelope
        const ampEnv = ctx.createGain();
        ampEnv.gain.setValueAtTime(0, now);

        const attack = params.ampAttack || 1.5;
        const decay = params.ampDecay || 2.5;
        const sustain = params.ampSustain || 0.4;
        const release = params.ampRelease || 2.0;

        ampEnv.gain.linearRampToValueAtTime(vel, now + attack);
        ampEnv.gain.linearRampToValueAtTime(vel * sustain, now + attack + decay);

        // Filter envelope
        const filterEnvAttack = params.filterAttack || 1.4;
        const filterEnvDecay = params.filterDecay || 4.2;
        const filterEnvSustain = params.filterSustain || 0.4;
        const filterEnvAmount = params.filterEnvAmount || 0.18;

        const filterPeak = baseCutoff + filterEnvAmount * 5000;
        filter.frequency.setValueAtTime(baseCutoff, now);
        filter.frequency.linearRampToValueAtTime(filterPeak, now + filterEnvAttack);
        filter.frequency.linearRampToValueAtTime(
            baseCutoff + (filterPeak - baseCutoff) * filterEnvSustain,
            now + filterEnvAttack + filterEnvDecay
        );

        // Connect
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        gain1.connect(mixer);
        gain2.connect(mixer);
        gain3.connect(mixer);
        mixer.connect(filter);
        filter.connect(ampEnv);
        ampEnv.connect(this.voiceMixer!);

        // LFO for pan modulation
        const panner = ctx.createStereoPanner();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        lfo.type = 'sine';
        lfo.frequency.value = params.lfo1Rate || 0.5;
        lfoGain.gain.value = params.lfo1Amount || 0.1;

        ampEnv.disconnect();
        ampEnv.connect(panner);
        panner.connect(this.voiceMixer!);
        lfo.connect(lfoGain);
        lfoGain.connect(panner.pan);

        // Start
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        lfo.start(now);

        // Store for cleanup
        const voiceNode = {
            oscillators: [osc1, osc2, osc3],
            gains: [gain1, gain2, gain3],
            mixer,
            filter,
            ampEnv,
            panner,
            lfo,
            lfoGain,
            release,
            sustain
        } as any;

        return {
            node: voiceNode,
            note,
            startTime: now,
            active: true
        };
    }

    private cleanupFallbackVoice(voice: Voice, note: number): void {
        if (!this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const v = voice.node as any;

        if (v.oscillators) {
            const release = v.release || 2.0;
            const currentLevel = v.ampEnv.gain.value;

            // Release envelope
            v.ampEnv.gain.cancelScheduledValues(now);
            v.ampEnv.gain.setValueAtTime(currentLevel, now);
            v.ampEnv.gain.linearRampToValueAtTime(0, now + release);

            // Filter release
            const currentFilter = v.filter.frequency.value;
            v.filter.frequency.cancelScheduledValues(now);
            v.filter.frequency.setValueAtTime(currentFilter, now);
            v.filter.frequency.linearRampToValueAtTime(200, now + release);

            // Schedule stop
            setTimeout(() => {
                try {
                    v.oscillators.forEach((osc: OscillatorNode) => osc.stop());
                    v.lfo.stop();
                } catch (e) {
                    // Already stopped
                }
                this.voices.delete(note);
            }, release * 1000 + 100);
        }
    }

    /**
     * Set a single parameter
     */
    setParam(name: string, value: number | string | boolean): void {
        this.currentParams[name] = value;

        // Apply to effects in real-time
        if (name.startsWith('chorus') && this.chorus) {
            if (name === 'chorusRate') this.chorus.setRate(value as number);
            if (name === 'chorusDepth') this.chorus.setDepth(value as number);
            if (name === 'chorusMix') this.chorus.setMix(value as number);
            if (name === 'chorusEnabled') this.chorus.setEnabled(value as boolean);
        }

        if (name.startsWith('reverb') && this.reverb) {
            if (name === 'reverbDecay') this.reverb.setDecay(value as number);
            if (name === 'reverbMix') this.reverb.setMix(value as number);
            if (name === 'reverbLowCut') this.reverb.setLowCut(value as number);
        }

        // Long Reverb parameters
        if (name.startsWith('longReverb') && this.longReverb) {
            if (name === 'longReverbDecay') this.longReverb.setDecayTime(value as number);
            if (name === 'longReverbPreDelay') this.longReverb.setPreDelay(value as number);
            if (name === 'longReverbDamping') this.longReverb.setDamping(value as number);
            if (name === 'longReverbDryWet') this.longReverb.setDryWet(value as number);
            if (name === 'longReverbWidth') this.longReverb.setStereoWidth(value as number);
            if (name === 'longReverbEnabled') this.longReverb.setEnabled(value as boolean);
        }
    }

    /**
     * Load a preset
     */
    loadPreset(preset: Preset): void {
        this.currentPreset = preset;
        const params = presetToParams(preset);

        Object.entries(params).forEach(([key, value]) => {
            this.currentParams[key] = value;
        });

        // Apply FX settings
        if (this.chorus) {
            this.chorus.setRate(params.chorusRate);
            this.chorus.setDepth(params.chorusDepth);
            this.chorus.setMix(params.chorusMix);
        }

        if (this.reverb) {
            this.reverb.setDecay(params.reverbDecay);
            this.reverb.setMix(params.reverbMix);
            this.reverb.setLowCut(params.reverbLowCut);
        }

        if (this.eq) {
            this.eq.setHighPassFreq(preset.fx.eq.highPassHz);
            this.eq.setLowShelfGain(preset.fx.eq.lowShelfDb);
        }

        console.log('Loaded preset:', preset.name);
    }

    /**
     * Get current preset
     */
    getCurrentPreset(): Preset {
        return this.currentPreset;
    }

    /**
     * All notes off
     */
    allNotesOff(): void {
        this.voices.forEach((voice, note) => {
            this.noteOff(note);
        });
    }

    /**
     * Destroy and cleanup
     */
    destroy(): void {
        this.allNotesOff();

        if (this.chorus) this.chorus.destroy();
        if (this.reverb) this.reverb.destroy();
        if (this.eq) this.eq.destroy();

        if (this.audioContext) {
            this.audioContext.close();
        }

        this.initialized = false;
    }
}
