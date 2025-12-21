/**
 * Preset Types and Management
 */

export interface OscillatorPreset {
    id: string;
    wave: 'sine' | 'triangle' | 'saw' | 'square';
    octave: number;
    semitone: number;
    fineCents: number;
    level: number;
    pan: number;
    ringMod?: { enabled: boolean; amount: number };
}

export interface NoisePreset {
    enabled: boolean;
    type: 'pink' | 'brown' | 'white';
    level: number;
    postFilter: boolean;
}

export interface FilterPreset {
    topology: string;
    cutoffNorm: number;
    resonanceNorm: number;
    drive: number;
    keyTrack: number;
    envAmount: number;
}

export interface EnvelopePreset {
    attackSec: number;
    decaySec: number;
    sustain: number;
    releaseSec: number;
}

export interface LFOPreset {
    id: string;
    shape: 'sine' | 'triangle' | 'saw' | 'square' | 'sh';
    sync: boolean;
    rateHz?: number;
    rateDiv?: string;
    depth: number;
}

export interface ModSlotPreset {
    source: string;
    target: string;
    amount: number;
    smoothingMs: number;
}

export interface DistortionPreset {
    enabled: boolean;
    type: string;
    drive: number;
    mix: number;
}

export interface ChorusPreset {
    enabled: boolean;
    rateHz: number;
    depth: number;
    mix: number;
}

export interface ReverbPreset {
    enabled: boolean;
    type: string;
    decaySec: number;
    preDelayMs: number;
    lowCutHz: number;
    highCutHz: number;
    mix: number;
}

export interface EQPreset {
    enabled: boolean;
    highPassHz: number;
    lowShelfHz: number;
    lowShelfDb: number;
}

export interface Preset {
    name: string;
    version: number;
    engine: string;
    synth: {
        polyphony: number;
        voiceSteal: string;
        glide: { enabled: boolean; timeSec: number };
        oscillators: OscillatorPreset[];
        noise: NoisePreset;
        mixer: { preFilterGain: number };
        filter: FilterPreset;
        ampEnv: EnvelopePreset;
        filterEnv: EnvelopePreset;
        lfos: LFOPreset[];
        modMatrix: ModSlotPreset[];
    };
    fx: {
        distortion: DistortionPreset;
        chorus: ChorusPreset;
        reverb: ReverbPreset;
        eq: EQPreset;
    };
}

/**
 * Convert preset to engine parameters
 */
export function presetToParams(preset: Preset) {
    const osc1 = preset.synth.oscillators[0];
    const osc2 = preset.synth.oscillators[1];
    const osc3 = preset.synth.oscillators[2];

    // Normalize cutoff from 0-1 to Hz (20-20000)
    const cutoffHz = 20 * Math.pow(1000, preset.synth.filter.cutoffNorm);

    return {
        // OSC1
        osc1Wave: osc1.wave,
        osc1Level: osc1.level,
        osc1Detune: osc1.fineCents,
        osc1Octave: osc1.octave,
        osc1Semitone: osc1.semitone,

        // OSC2
        osc2Wave: osc2.wave,
        osc2Level: osc2.level,
        osc2Detune: osc2.fineCents,
        osc2Octave: osc2.octave,
        osc2Semitone: osc2.semitone,

        // OSC3
        osc3Wave: osc3.wave,
        osc3Level: osc3.level,
        osc3Detune: osc3.fineCents,
        osc3Octave: osc3.octave,
        osc3Semitone: osc3.semitone,

        // Noise
        noiseType: preset.synth.noise.enabled ? preset.synth.noise.type : 'off',
        noiseLevel: preset.synth.noise.level,

        // Filter
        filterType: 'lp24',
        filterCutoff: cutoffHz,
        filterRes: preset.synth.filter.resonanceNorm,
        filterEnvAmount: preset.synth.filter.envAmount,
        filterKeyTrack: preset.synth.filter.keyTrack,

        // Amp Env
        ampAttack: preset.synth.ampEnv.attackSec,
        ampDecay: preset.synth.ampEnv.decaySec,
        ampSustain: preset.synth.ampEnv.sustain,
        ampRelease: preset.synth.ampEnv.releaseSec,

        // Filter Env
        filterAttack: preset.synth.filterEnv.attackSec,
        filterDecay: preset.synth.filterEnv.decaySec,
        filterSustain: preset.synth.filterEnv.sustain,
        filterRelease: preset.synth.filterEnv.releaseSec,

        // LFO1
        lfo1Wave: preset.synth.lfos[0]?.shape || 'sine',
        lfo1Rate: preset.synth.lfos[0]?.rateHz || 1.0,
        lfo1Amount: 0.15,
        lfo1Target: 'pan',

        // LFO2
        lfo2Wave: preset.synth.lfos[1]?.shape || 'sine',
        lfo2Rate: preset.synth.lfos[1]?.rateHz || 0.5,
        lfo2Amount: 0.1,
        lfo2Target: 'filter',

        // FX
        chorusRate: preset.fx.chorus.rateHz,
        chorusDepth: preset.fx.chorus.depth,
        chorusMix: preset.fx.chorus.mix,
        reverbDecay: preset.fx.reverb.decaySec,
        reverbMix: preset.fx.reverb.mix,
        reverbLowCut: preset.fx.reverb.lowCutHz
    };
}

/**
 * Default ES2 Purity-like preset
 */
export const ES2_PURITY_PRESET: Preset = {
    name: "ES2 Purity (approx v1)",
    version: 1,
    engine: "web-synth-v1",
    synth: {
        polyphony: 12,
        voiceSteal: "oldest",
        glide: { enabled: false, timeSec: 0.0 },
        oscillators: [
            {
                id: "osc1",
                wave: "sine",
                octave: 0,
                semitone: 0,
                fineCents: -9,
                level: 1.0,
                pan: 0.0
            },
            {
                id: "osc2",
                wave: "sine",
                octave: 0,
                semitone: 12,
                fineCents: -1,
                level: 0.8,
                pan: 0.0,
                ringMod: { enabled: true, amount: 0.08 }
            },
            {
                id: "osc3",
                wave: "sine",
                octave: 0,
                semitone: 0,
                fineCents: 10,
                level: 0.55,
                pan: 0.0
            }
        ],
        noise: {
            enabled: true,
            type: "pink",
            level: 0.04,
            postFilter: true
        },
        mixer: { preFilterGain: 1.0 },
        filter: {
            topology: "ladder_lp24",
            cutoffNorm: 0.42,
            resonanceNorm: 0.12,
            drive: 0.04,
            keyTrack: 0.5,
            envAmount: 0.18
        },
        ampEnv: {
            attackSec: 1.5,
            decaySec: 2.5,
            sustain: 0.4,
            releaseSec: 2.0
        },
        filterEnv: {
            attackSec: 1.4,
            decaySec: 4.2,
            sustain: 0.4,
            releaseSec: 2.0
        },
        lfos: [
            {
                id: "lfo1",
                shape: "sine",
                sync: false,
                rateHz: 1.9,
                depth: 1.0
            },
            {
                id: "lfo2",
                shape: "sine",
                sync: true,
                rateDiv: "1/1",
                rateHz: 0.5,
                depth: 1.0
            }
        ],
        modMatrix: [
            { source: "velocity", target: "filter.cutoff", amount: 0.10, smoothingMs: 20 },
            { source: "env.filter", target: "filter.cutoff", amount: 0.18, smoothingMs: 20 },
            { source: "lfo2", target: "pan", amount: 0.10, smoothingMs: 50 },
            { source: "lfo2", target: "osc.detuneCentsAll", amount: 3.0, smoothingMs: 50 },
            { source: "lfo2", target: "filter.cutoff", amount: 0.03, smoothingMs: 50 },
            { source: "modwheel", target: "filter.cutoff", amount: 0.12, smoothingMs: 30 }
        ]
    },
    fx: {
        distortion: {
            enabled: true,
            type: "soft",
            drive: 0.10,
            mix: 0.12
        },
        chorus: {
            enabled: true,
            rateHz: 0.25,
            depth: 0.25,
            mix: 0.18
        },
        reverb: {
            enabled: true,
            type: "algo",
            decaySec: 8.0,
            preDelayMs: 20,
            lowCutHz: 250,
            highCutHz: 9000,
            mix: 0.12
        },
        eq: {
            enabled: true,
            highPassHz: 140,
            lowShelfHz: 120,
            lowShelfDb: -1.5
        }
    }
};

/**
 * Init preset (basic sound)
 */
export const INIT_PRESET: Preset = {
    name: "Init",
    version: 1,
    engine: "web-synth-v1",
    synth: {
        polyphony: 8,
        voiceSteal: "oldest",
        glide: { enabled: false, timeSec: 0.0 },
        oscillators: [
            { id: "osc1", wave: "saw", octave: 0, semitone: 0, fineCents: 0, level: 1.0, pan: 0.0 },
            { id: "osc2", wave: "saw", octave: 0, semitone: 0, fineCents: 7, level: 0.5, pan: 0.0 },
            { id: "osc3", wave: "saw", octave: -1, semitone: 0, fineCents: 0, level: 0.3, pan: 0.0 }
        ],
        noise: { enabled: false, type: "pink", level: 0.0, postFilter: true },
        mixer: { preFilterGain: 1.0 },
        filter: {
            topology: "ladder_lp24",
            cutoffNorm: 0.6,
            resonanceNorm: 0.2,
            drive: 0.0,
            keyTrack: 0.5,
            envAmount: 0.3
        },
        ampEnv: { attackSec: 0.01, decaySec: 0.5, sustain: 0.7, releaseSec: 0.3 },
        filterEnv: { attackSec: 0.01, decaySec: 0.8, sustain: 0.3, releaseSec: 0.5 },
        lfos: [
            { id: "lfo1", shape: "sine", sync: false, rateHz: 5.0, depth: 1.0 },
            { id: "lfo2", shape: "sine", sync: false, rateHz: 1.0, depth: 1.0 }
        ],
        modMatrix: []
    },
    fx: {
        distortion: { enabled: false, type: "soft", drive: 0.0, mix: 0.0 },
        chorus: { enabled: false, rateHz: 1.0, depth: 0.3, mix: 0.0 },
        reverb: { enabled: true, type: "algo", decaySec: 2.0, preDelayMs: 10, lowCutHz: 200, highCutHz: 10000, mix: 0.15 },
        eq: { enabled: true, highPassHz: 30, lowShelfHz: 100, lowShelfDb: 0 }
    }
};
