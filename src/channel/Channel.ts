/**
 * Channel - Combines a SynthEngine with a Sequencer
 * Like a Logic Pro track with an instrument and MIDI region
 */

import { SynthEngine } from '../synth/SynthEngine';
import { Sequencer } from '../sequencer/Sequencer';
import { Preset, ES2_PURITY_PRESET } from '../synth/Preset';

export interface ChannelConfig {
    id: number;
    name: string;
    color: string;
    preset?: Preset;
    muted?: boolean;
    solo?: boolean;
    volume?: number;
    pan?: number;
}

export class Channel {
    readonly id: number;
    private _name: string;
    private _color: string;
    private _muted: boolean = false;
    private _solo: boolean = false;
    private _volume: number = 1.0;
    private _pan: number = 0;
    private _armed: boolean = false;

    private synth: SynthEngine;
    private sequencer: Sequencer;
    private volumeNode: GainNode | null = null;
    private panNode: StereoPannerNode | null = null;
    private masterOutput: AudioNode | null = null;

    constructor(config: ChannelConfig) {
        this.id = config.id;
        this._name = config.name;
        this._color = config.color;
        this._muted = config.muted || false;
        this._solo = config.solo || false;
        this._volume = config.volume ?? 1.0;
        this._pan = config.pan ?? 0;

        this.synth = new SynthEngine();
        this.sequencer = new Sequencer(this.synth);
    }

    /**
     * Initialize the channel's audio engine
     */
    async init(sharedContext?: AudioContext, masterOutput?: AudioNode): Promise<void> {
        await this.synth.init(sharedContext);

        const ctx = this.synth.getAudioContext();
        if (!ctx) return;

        // Create channel strip nodes
        this.volumeNode = ctx.createGain();
        this.volumeNode.gain.value = this._muted ? 0 : this._volume;

        this.panNode = ctx.createStereoPanner();
        this.panNode.pan.value = this._pan;

        // Get synth output (analyser) and disconnect from destination
        const analyser = this.synth.getAnalyser();
        if (analyser) {
            // Reconnect through channel strip
            analyser.disconnect();
            analyser.connect(this.volumeNode);
            this.volumeNode.connect(this.panNode);

            if (masterOutput) {
                this.masterOutput = masterOutput;
                this.panNode.connect(masterOutput);
            } else {
                this.panNode.connect(ctx.destination);
            }
        }

        // Load default preset
        this.synth.loadPreset(ES2_PURITY_PRESET);
    }

    /**
     * Connect to a master output
     */
    connectToMaster(masterOutput: AudioNode): void {
        if (this.panNode) {
            this.panNode.disconnect();
            this.panNode.connect(masterOutput);
            this.masterOutput = masterOutput;
        }
    }

    // Getters
    get name(): string { return this._name; }
    get color(): string { return this._color; }
    get muted(): boolean { return this._muted; }
    get solo(): boolean { return this._solo; }
    get volume(): number { return this._volume; }
    get pan(): number { return this._pan; }
    get armed(): boolean { return this._armed; }

    // Setters with audio updates
    set name(value: string) { this._name = value; }
    set color(value: string) { this._color = value; }

    set muted(value: boolean) {
        this._muted = value;
        if (this.volumeNode) {
            this.volumeNode.gain.value = value ? 0 : this._volume;
        }
    }

    set solo(value: boolean) {
        this._solo = value;
        // Solo logic is handled by ChannelManager
    }

    set volume(value: number) {
        this._volume = Math.max(0, Math.min(1, value));
        if (this.volumeNode && !this._muted) {
            this.volumeNode.gain.value = this._volume;
        }
    }

    set pan(value: number) {
        this._pan = Math.max(-1, Math.min(1, value));
        if (this.panNode) {
            this.panNode.pan.value = this._pan;
        }
    }

    set armed(value: boolean) {
        this._armed = value;
    }

    /**
     * Get the synth engine
     */
    getSynth(): SynthEngine {
        return this.synth;
    }

    /**
     * Get the sequencer
     */
    getSequencer(): Sequencer {
        return this.sequencer;
    }

    /**
     * Load a preset
     */
    loadPreset(preset: Preset): void {
        this.synth.loadPreset(preset);
    }

    /**
     * Get current preset
     */
    getCurrentPreset(): Preset {
        return this.synth.getCurrentPreset();
    }

    /**
     * Play a note (for live playing / armed channel)
     */
    noteOn(note: number, velocity: number = 100): void {
        this.synth.noteOn(note, velocity);
    }

    /**
     * Stop a note
     */
    noteOff(note: number): void {
        this.synth.noteOff(note);
    }

    /**
     * All notes off
     */
    allNotesOff(): void {
        this.synth.allNotesOff();
    }

    /**
     * Check if synth is initialized
     */
    isInitialized(): boolean {
        return this.synth.isInitialized();
    }

    /**
     * Destroy the channel
     */
    destroy(): void {
        this.sequencer.stop();
        this.synth.destroy();

        if (this.volumeNode) {
            this.volumeNode.disconnect();
        }
        if (this.panNode) {
            this.panNode.disconnect();
        }
    }

    /**
     * Export channel data for saving
     */
    exportData(): ChannelSaveData {
        return {
            id: this.id,
            name: this._name,
            color: this._color,
            muted: this._muted,
            solo: this._solo,
            volume: this._volume,
            pan: this._pan,
            synthParams: this.synth.getParams(),
            sequencerData: this.sequencer.exportData()
        };
    }

    /**
     * Import channel data from saved state
     */
    importData(data: Partial<ChannelSaveData>): void {
        if (data.name) this._name = data.name;
        if (data.color) this._color = data.color;
        if (data.muted !== undefined) this.muted = data.muted;
        if (data.solo !== undefined) this.solo = data.solo;
        if (data.volume !== undefined) this.volume = data.volume;
        if (data.pan !== undefined) this.pan = data.pan;
        if (data.synthParams) this.synth.setParams(data.synthParams);
        if (data.sequencerData) this.sequencer.importData(data.sequencerData);
    }
}

export interface ChannelSaveData {
    id: number;
    name: string;
    color: string;
    muted: boolean;
    solo: boolean;
    volume: number;
    pan: number;
    synthParams: Record<string, any>;
    sequencerData: { steps: any[], length: number, swing: number };
}
