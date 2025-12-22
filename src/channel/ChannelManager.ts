/**
 * Channel Manager - Manages multiple channels with global transport
 * Like Logic Pro's mixer/arrangement view
 */

import { Channel, ChannelConfig } from './Channel';

// Default channel colors (Logic Pro inspired)
const CHANNEL_COLORS = [
    '#4a90b8', // Blue
    '#e06040', // Red/Orange
    '#50b860', // Green
    '#b060c0', // Purple
    '#e0a040', // Yellow/Orange
    '#60b0b0', // Cyan
    '#c06080', // Pink
    '#80a060', // Olive
];

export class ChannelManager {
    private channels: Map<number, Channel> = new Map();
    private nextChannelId: number = 1;
    private _selectedChannelId: number | null = null;
    private _isPlaying: boolean = false;
    private _bpm: number = 120;

    private masterContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private masterAnalyser: AnalyserNode | null = null;

    private onChannelChange: (() => void) | null = null;
    private onSelectionChange: ((channelId: number | null) => void) | null = null;
    private onTransportChange: ((isPlaying: boolean) => void) | null = null;

    constructor() {}

    /**
     * Initialize the master audio context
     */
    async initMaster(): Promise<void> {
        this.masterContext = new AudioContext();

        this.masterGain = this.masterContext.createGain();
        this.masterGain.gain.value = 0.8;

        this.masterAnalyser = this.masterContext.createAnalyser();
        this.masterAnalyser.fftSize = 2048;

        this.masterGain.connect(this.masterAnalyser);
        this.masterAnalyser.connect(this.masterContext.destination);
    }

    /**
     * Create a new channel
     */
    async createChannel(name?: string): Promise<Channel> {
        const id = this.nextChannelId++;
        const colorIndex = (id - 1) % CHANNEL_COLORS.length;

        const config: ChannelConfig = {
            id,
            name: name || `Track ${id}`,
            color: CHANNEL_COLORS[colorIndex],
        };

        const channel = new Channel(config);
        await channel.init();

        // Connect to master if available
        if (this.masterGain) {
            channel.connectToMaster(this.masterGain);
        }

        // Set BPM
        channel.getSequencer().setBpm(this._bpm);

        this.channels.set(id, channel);

        // Select if first channel
        if (this._selectedChannelId === null) {
            this._selectedChannelId = id;
        }

        this.notifyChannelChange();
        return channel;
    }

    /**
     * Remove a channel
     */
    removeChannel(id: number): void {
        const channel = this.channels.get(id);
        if (channel) {
            channel.destroy();
            this.channels.delete(id);

            // Update selection
            if (this._selectedChannelId === id) {
                const remaining = Array.from(this.channels.keys());
                this._selectedChannelId = remaining.length > 0 ? remaining[0] : null;
                this.notifySelectionChange();
            }

            this.notifyChannelChange();
        }
    }

    /**
     * Get a channel by ID
     */
    getChannel(id: number): Channel | undefined {
        return this.channels.get(id);
    }

    /**
     * Get all channels
     */
    getAllChannels(): Channel[] {
        return Array.from(this.channels.values());
    }

    /**
     * Get channel count
     */
    getChannelCount(): number {
        return this.channels.size;
    }

    /**
     * Get selected channel
     */
    getSelectedChannel(): Channel | null {
        if (this._selectedChannelId === null) return null;
        return this.channels.get(this._selectedChannelId) || null;
    }

    /**
     * Get selected channel ID
     */
    get selectedChannelId(): number | null {
        return this._selectedChannelId;
    }

    /**
     * Select a channel
     */
    selectChannel(id: number): void {
        if (this.channels.has(id)) {
            this._selectedChannelId = id;
            this.notifySelectionChange();
        }
    }

    /**
     * Play all channels
     */
    play(): void {
        if (this._isPlaying) return;

        this._isPlaying = true;
        this.channels.forEach(channel => {
            if (!channel.muted && (!this.hasSoloChannel() || channel.solo)) {
                channel.getSequencer().play();
            }
        });

        this.notifyTransportChange();
    }

    /**
     * Stop all channels
     */
    stop(): void {
        this._isPlaying = false;
        this.channels.forEach(channel => {
            channel.getSequencer().stop();
            channel.allNotesOff();
        });

        this.notifyTransportChange();
    }

    /**
     * Check if any channel is soloed
     */
    private hasSoloChannel(): boolean {
        return Array.from(this.channels.values()).some(ch => ch.solo);
    }

    /**
     * Update mute states based on solo
     */
    updateSoloMuteStates(): void {
        const hasSolo = this.hasSoloChannel();

        this.channels.forEach(channel => {
            const shouldPlay = !hasSolo || channel.solo;
            const sequencer = channel.getSequencer();

            if (this._isPlaying) {
                if (shouldPlay && !channel.muted && !sequencer.getIsPlaying()) {
                    sequencer.play();
                } else if ((!shouldPlay || channel.muted) && sequencer.getIsPlaying()) {
                    sequencer.stop();
                    channel.allNotesOff();
                }
            }
        });
    }

    /**
     * Get playing state
     */
    get isPlaying(): boolean {
        return this._isPlaying;
    }

    /**
     * Set BPM for all channels
     */
    setBpm(bpm: number): void {
        this._bpm = Math.max(20, Math.min(300, bpm));
        this.channels.forEach(channel => {
            channel.getSequencer().setBpm(this._bpm);
        });
    }

    /**
     * Get BPM
     */
    get bpm(): number {
        return this._bpm;
    }

    /**
     * Get master analyser
     */
    getMasterAnalyser(): AnalyserNode | null {
        return this.masterAnalyser;
    }

    /**
     * Set sequence length for all channels
     */
    setLength(length: 16 | 32 | 64 | 128): void {
        this.channels.forEach(channel => {
            channel.getSequencer().setLength(length);
        });
    }

    // Event handlers
    setOnChannelChange(callback: () => void): void {
        this.onChannelChange = callback;
    }

    setOnSelectionChange(callback: (channelId: number | null) => void): void {
        this.onSelectionChange = callback;
    }

    setOnTransportChange(callback: (isPlaying: boolean) => void): void {
        this.onTransportChange = callback;
    }

    private notifyChannelChange(): void {
        if (this.onChannelChange) this.onChannelChange();
    }

    private notifySelectionChange(): void {
        if (this.onSelectionChange) this.onSelectionChange(this._selectedChannelId);
    }

    private notifyTransportChange(): void {
        if (this.onTransportChange) this.onTransportChange(this._isPlaying);
    }

    /**
     * Destroy all channels
     */
    destroy(): void {
        this.stop();
        this.channels.forEach(channel => channel.destroy());
        this.channels.clear();

        if (this.masterContext) {
            this.masterContext.close();
        }
    }
}
