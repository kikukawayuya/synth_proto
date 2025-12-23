/**
 * Channel Strip UI Component
 * Logic Pro style mixer channel strip with vertical fader and level meter
 */

import { Channel } from '../channel/Channel';
import { ChannelManager } from '../channel/ChannelManager';

export class ChannelStripUI {
    private container: HTMLElement;
    private channelManager: ChannelManager;
    private onSelect: ((channel: Channel) => void) | null = null;
    private animationFrame: number | null = null;
    private levelMeters: Map<number, HTMLElement> = new Map();

    constructor(container: HTMLElement, channelManager: ChannelManager) {
        this.container = container;
        this.channelManager = channelManager;

        // Listen for changes
        channelManager.setOnChannelChange(() => this.render());
        channelManager.setOnSelectionChange(() => this.render());

        // Start level meter animation
        this.startLevelMeters();
    }

    /**
     * Render all channel strips
     */
    render(): void {
        this.container.innerHTML = '';
        this.levelMeters.clear();

        const channels = this.channelManager.getAllChannels();
        const selectedId = this.channelManager.selectedChannelId;

        channels.forEach(channel => {
            const strip = this.createChannelStrip(channel, channel.id === selectedId);
            this.container.appendChild(strip);
        });

        // Add "+" button to create new channel
        const addBtn = document.createElement('div');
        addBtn.className = 'channel-strip channel-strip-add';
        addBtn.innerHTML = '<span class="add-icon">+</span>';
        addBtn.addEventListener('click', async () => {
            await this.channelManager.createChannel();
        });
        this.container.appendChild(addBtn);
    }

    /**
     * Create a single channel strip element
     */
    private createChannelStrip(channel: Channel, isSelected: boolean): HTMLElement {
        const strip = document.createElement('div');
        strip.className = `channel-strip ${isSelected ? 'selected' : ''} ${channel.muted ? 'muted' : ''}`;

        // Color bar at top
        const colorBar = document.createElement('div');
        colorBar.className = 'channel-color-bar';
        colorBar.style.backgroundColor = channel.color;
        strip.appendChild(colorBar);

        // Channel name
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'channel-name';
        nameInput.value = channel.name;
        nameInput.addEventListener('change', () => {
            channel.name = nameInput.value;
        });
        this.preventPropagation(nameInput);
        strip.appendChild(nameInput);

        // Mute/Solo buttons
        const btnRow = document.createElement('div');
        btnRow.className = 'channel-btn-row';

        const muteBtn = document.createElement('button');
        muteBtn.className = `channel-btn mute ${channel.muted ? 'active' : ''}`;
        muteBtn.textContent = 'M';
        muteBtn.title = 'Mute';
        muteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            channel.muted = !channel.muted;
            this.channelManager.updateSoloMuteStates();
            this.render();
        });

        const soloBtn = document.createElement('button');
        soloBtn.className = `channel-btn solo ${channel.solo ? 'active' : ''}`;
        soloBtn.textContent = 'S';
        soloBtn.title = 'Solo';
        soloBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            channel.solo = !channel.solo;
            this.channelManager.updateSoloMuteStates();
            this.render();
        });

        btnRow.appendChild(muteBtn);
        btnRow.appendChild(soloBtn);
        strip.appendChild(btnRow);

        // Fader section (meter + slider)
        const faderSection = document.createElement('div');
        faderSection.className = 'channel-fader-section';

        // Level meter
        const meterContainer = document.createElement('div');
        meterContainer.className = 'channel-meter-container';

        const meterFill = document.createElement('div');
        meterFill.className = 'channel-meter-fill';
        meterContainer.appendChild(meterFill);

        // Store reference for animation
        this.levelMeters.set(channel.id, meterFill);

        // Fader track + thumb
        const faderTrack = document.createElement('div');
        faderTrack.className = 'channel-fader-track';

        const faderThumb = document.createElement('div');
        faderThumb.className = 'channel-fader-thumb';
        faderThumb.style.bottom = `${channel.volume * 100}%`;
        faderTrack.appendChild(faderThumb);

        // Hidden range input for interaction
        const volumeInput = document.createElement('input');
        volumeInput.type = 'range';
        volumeInput.className = 'channel-fader-input';
        volumeInput.min = '0';
        volumeInput.max = '100';
        volumeInput.value = String(channel.volume * 100);
        volumeInput.addEventListener('input', () => {
            const val = parseInt(volumeInput.value) / 100;
            channel.volume = val;
            faderThumb.style.bottom = `${val * 100}%`;
            volumeValue.textContent = this.formatDb(val);
        });
        this.preventPropagation(volumeInput);

        faderTrack.appendChild(volumeInput);
        faderSection.appendChild(meterContainer);
        faderSection.appendChild(faderTrack);
        strip.appendChild(faderSection);

        // Volume value display
        const volumeValue = document.createElement('div');
        volumeValue.className = 'channel-volume-value';
        volumeValue.textContent = this.formatDb(channel.volume);
        strip.appendChild(volumeValue);

        // Pan knob
        const panSection = document.createElement('div');
        panSection.className = 'channel-pan-section';

        const panKnob = document.createElement('div');
        panKnob.className = 'channel-pan-knob';

        const panIndicator = document.createElement('div');
        panIndicator.className = 'channel-pan-indicator';
        panIndicator.style.transform = `rotate(${channel.pan * 135}deg)`;
        panKnob.appendChild(panIndicator);

        const panInput = document.createElement('input');
        panInput.type = 'range';
        panInput.className = 'channel-pan-input';
        panInput.min = '-100';
        panInput.max = '100';
        panInput.value = String(channel.pan * 100);
        panInput.addEventListener('input', () => {
            const val = parseInt(panInput.value) / 100;
            channel.pan = val;
            panIndicator.style.transform = `rotate(${val * 135}deg)`;
            panLabel.textContent = this.formatPan(val);
        });
        this.preventPropagation(panInput);

        panSection.appendChild(panKnob);
        panSection.appendChild(panInput);

        const panLabel = document.createElement('div');
        panLabel.className = 'channel-pan-label';
        panLabel.textContent = this.formatPan(channel.pan);
        panSection.appendChild(panLabel);

        strip.appendChild(panSection);

        // Delete button (hidden, shows on hover)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'channel-delete';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Delete Track';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.channelManager.getChannelCount() > 1) {
                this.channelManager.removeChannel(channel.id);
            }
        });
        strip.appendChild(deleteBtn);

        // Select channel on click
        strip.addEventListener('click', () => {
            this.channelManager.selectChannel(channel.id);
            if (this.onSelect) {
                this.onSelect(channel);
            }
        });

        return strip;
    }

    private preventPropagation(element: HTMLElement): void {
        ['click', 'mousedown', 'pointerdown', 'touchstart'].forEach(event => {
            element.addEventListener(event, (e) => e.stopPropagation());
        });
    }

    private formatDb(volume: number): string {
        if (volume === 0) return '-∞';
        const db = 20 * Math.log10(volume);
        if (db >= 0) return `+${db.toFixed(1)}`;
        return db.toFixed(1);
    }

    private formatPan(pan: number): string {
        if (Math.abs(pan) < 0.05) return 'C';
        if (pan < 0) return `L${Math.round(Math.abs(pan) * 100)}`;
        return `R${Math.round(pan * 100)}`;
    }

    private startLevelMeters(): void {
        const updateMeters = () => {
            this.levelMeters.forEach((meterFill, channelId) => {
                const channel = this.channelManager.getChannel(channelId);
                if (channel) {
                    const analyser = channel.getSynth().getAnalyser();
                    if (analyser) {
                        const dataArray = new Uint8Array(analyser.frequencyBinCount);
                        analyser.getByteFrequencyData(dataArray);

                        let sum = 0;
                        for (let i = 0; i < dataArray.length; i++) {
                            sum += dataArray[i];
                        }
                        const avg = sum / dataArray.length;
                        const level = Math.min(100, (avg / 128) * 100);

                        meterFill.style.height = `${level}%`;

                        // Color based on level
                        if (level > 85) {
                            meterFill.style.background = 'linear-gradient(to top, #50b860 0%, #e0c040 70%, #e06040 100%)';
                        } else if (level > 60) {
                            meterFill.style.background = 'linear-gradient(to top, #50b860 0%, #e0c040 100%)';
                        } else {
                            meterFill.style.background = '#50b860';
                        }
                    }
                }
            });
            this.animationFrame = requestAnimationFrame(updateMeters);
        };
        updateMeters();
    }

    /**
     * Set selection callback
     */
    setOnSelect(callback: (channel: Channel) => void): void {
        this.onSelect = callback;
    }

    destroy(): void {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}

// CSS for channel strips - Logic Pro style
export const channelStripStyles = `
.channel-strips-container {
    display: flex;
    gap: 2px;
    padding: 8px;
    background: #1a1e24;
    border-radius: 4px;
    overflow-x: auto;
    min-height: 280px;
}

.channel-strip {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 70px;
    min-width: 70px;
    background: linear-gradient(180deg, #2a2f38 0%, #1e2228 100%);
    border-radius: 4px;
    padding: 0;
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
    overflow: hidden;
}

.channel-strip:hover {
    background: linear-gradient(180deg, #323842 0%, #252a32 100%);
}

.channel-strip.selected {
    box-shadow: 0 0 0 2px #4a90b8;
}

.channel-strip.muted {
    opacity: 0.6;
}

.channel-strip.muted .channel-meter-fill {
    opacity: 0.3;
}

.channel-color-bar {
    width: 100%;
    height: 4px;
    flex-shrink: 0;
}

.channel-name {
    width: calc(100% - 8px);
    background: transparent;
    border: none;
    color: #e0e0e0;
    font-size: 9px;
    font-weight: 600;
    text-align: center;
    padding: 6px 4px 4px;
    border-radius: 2px;
    text-overflow: ellipsis;
    overflow: hidden;
}

.channel-name:focus {
    background: rgba(0,0,0,0.3);
    outline: none;
}

.channel-btn-row {
    display: flex;
    gap: 2px;
    padding: 0 4px;
    width: 100%;
    box-sizing: border-box;
}

.channel-btn {
    flex: 1;
    padding: 3px 0;
    border: none;
    border-radius: 2px;
    font-size: 9px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.1s;
}

.channel-btn.mute {
    background: #3a4250;
    color: #666;
}

.channel-btn.mute:hover {
    background: #4a5260;
}

.channel-btn.mute.active {
    background: #e06040;
    color: white;
}

.channel-btn.solo {
    background: #3a4250;
    color: #666;
}

.channel-btn.solo:hover {
    background: #4a5260;
}

.channel-btn.solo.active {
    background: #e0c040;
    color: #1a1e24;
}

.channel-fader-section {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    flex: 1;
    width: 100%;
    padding: 8px 6px;
    min-height: 120px;
}

.channel-meter-container {
    width: 8px;
    height: 100%;
    background: #1a1e24;
    border-radius: 2px;
    position: relative;
    overflow: hidden;
}

.channel-meter-fill {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 0%;
    background: #50b860;
    border-radius: 2px;
    transition: height 0.05s ease-out;
}

.channel-fader-track {
    width: 28px;
    height: 100%;
    background: linear-gradient(90deg, #1a1e24 0%, #2a3038 50%, #1a1e24 100%);
    border-radius: 3px;
    position: relative;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
}

.channel-fader-thumb {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 12px;
    background: linear-gradient(180deg, #5a6570 0%, #3a4250 50%, #2a3240 100%);
    border-radius: 2px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
    pointer-events: none;
}

.channel-fader-thumb::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 4px;
    right: 4px;
    height: 1px;
    background: rgba(255,255,255,0.3);
}

.channel-fader-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: ns-resize;
    writing-mode: vertical-lr;
    direction: rtl;
    -webkit-appearance: slider-vertical;
}

.channel-volume-value {
    font-size: 9px;
    color: #888;
    font-family: 'SF Mono', monospace;
    padding: 2px 0;
}

.channel-pan-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px;
    position: relative;
}

.channel-pan-knob {
    width: 28px;
    height: 28px;
    background: linear-gradient(180deg, #4a5260 0%, #2a3240 100%);
    border-radius: 50%;
    position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
}

.channel-pan-indicator {
    position: absolute;
    top: 4px;
    left: 50%;
    width: 2px;
    height: 8px;
    background: #e0e0e0;
    border-radius: 1px;
    transform-origin: bottom center;
    margin-left: -1px;
}

.channel-pan-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 28px;
    height: 28px;
    opacity: 0;
    cursor: ew-resize;
}

.channel-pan-label {
    font-size: 8px;
    color: #666;
    margin-top: 2px;
}

.channel-delete {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 14px;
    height: 14px;
    padding: 0;
    border: none;
    background: rgba(0,0,0,0.3);
    color: #666;
    font-size: 12px;
    line-height: 14px;
    text-align: center;
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s;
    border-radius: 2px;
}

.channel-strip:hover .channel-delete {
    opacity: 1;
}

.channel-delete:hover {
    background: #e06040;
    color: white;
}

.channel-strip-add {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 2px dashed #3a4250;
    color: #5a6570;
    min-height: 260px;
}

.channel-strip-add:hover {
    background: rgba(74, 144, 184, 0.1);
    border-color: #4a90b8;
    color: #4a90b8;
}

.channel-strip-add .add-icon {
    font-size: 28px;
    font-weight: 300;
}
`;
