/**
 * Channel Strip UI Component
 * Displays channel controls: name, mute, solo, volume, pan
 * Logic Pro style mixer channel strip
 */

import { Channel } from '../channel/Channel';
import { ChannelManager } from '../channel/ChannelManager';

export class ChannelStripUI {
    private container: HTMLElement;
    private channelManager: ChannelManager;
    private onSelect: ((channel: Channel) => void) | null = null;

    constructor(container: HTMLElement, channelManager: ChannelManager) {
        this.container = container;
        this.channelManager = channelManager;

        // Listen for changes
        channelManager.setOnChannelChange(() => this.render());
        channelManager.setOnSelectionChange(() => this.render());
    }

    /**
     * Render all channel strips
     */
    render(): void {
        this.container.innerHTML = '';

        const channels = this.channelManager.getAllChannels();
        const selectedId = this.channelManager.selectedChannelId;

        channels.forEach(channel => {
            const strip = this.createChannelStrip(channel, channel.id === selectedId);
            this.container.appendChild(strip);
        });

        // Add "+" button to create new channel
        const addBtn = document.createElement('div');
        addBtn.className = 'channel-strip channel-strip-add';
        addBtn.innerHTML = '<span class="add-icon">+</span><span class="add-text">Add Track</span>';
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
        strip.className = `channel-strip ${isSelected ? 'selected' : ''}`;
        strip.style.borderTopColor = channel.color;

        // Channel header (color indicator + name)
        const header = document.createElement('div');
        header.className = 'channel-header';
        header.style.backgroundColor = channel.color;

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'channel-name';
        nameInput.value = channel.name;
        nameInput.addEventListener('change', () => {
            channel.name = nameInput.value;
        });
        nameInput.addEventListener('click', (e) => e.stopPropagation());

        header.appendChild(nameInput);
        strip.appendChild(header);

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

        // Volume slider (vertical)
        const volumeContainer = document.createElement('div');
        volumeContainer.className = 'channel-volume-container';

        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.className = 'channel-volume';
        volumeSlider.min = '0';
        volumeSlider.max = '100';
        volumeSlider.value = String(channel.volume * 100);
        volumeSlider.addEventListener('input', (e) => {
            e.stopPropagation();
            channel.volume = parseInt(volumeSlider.value) / 100;
        });
        volumeSlider.addEventListener('click', (e) => e.stopPropagation());

        const volumeLabel = document.createElement('div');
        volumeLabel.className = 'channel-volume-label';
        volumeLabel.textContent = `${Math.round(channel.volume * 100)}%`;

        volumeContainer.appendChild(volumeSlider);
        volumeContainer.appendChild(volumeLabel);
        strip.appendChild(volumeContainer);

        // Pan knob (simplified as slider)
        const panContainer = document.createElement('div');
        panContainer.className = 'channel-pan-container';

        const panLabel = document.createElement('div');
        panLabel.className = 'channel-pan-label';
        panLabel.textContent = 'Pan';

        const panSlider = document.createElement('input');
        panSlider.type = 'range';
        panSlider.className = 'channel-pan';
        panSlider.min = '-100';
        panSlider.max = '100';
        panSlider.value = String(channel.pan * 100);
        panSlider.addEventListener('input', (e) => {
            e.stopPropagation();
            channel.pan = parseInt(panSlider.value) / 100;
        });
        panSlider.addEventListener('click', (e) => e.stopPropagation());

        panContainer.appendChild(panLabel);
        panContainer.appendChild(panSlider);
        strip.appendChild(panContainer);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'channel-delete';
        deleteBtn.textContent = '×';
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

    /**
     * Set selection callback
     */
    setOnSelect(callback: (channel: Channel) => void): void {
        this.onSelect = callback;
    }
}

// CSS for channel strips
export const channelStripStyles = `
.channel-strips-container {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: #1a1e24;
  border-radius: 4px;
  overflow-x: auto;
  min-height: 200px;
}

.channel-strip {
  display: flex;
  flex-direction: column;
  width: 80px;
  min-width: 80px;
  background: #252a32;
  border-radius: 4px;
  border-top: 3px solid #4a90b8;
  padding: 8px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  position: relative;
}

.channel-strip:hover {
  background: #2a3038;
}

.channel-strip.selected {
  background: #2a3540;
  box-shadow: 0 0 0 2px rgba(74, 144, 184, 0.5);
}

.channel-strip-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1e2228;
  border: 2px dashed #3a4250;
  border-top: 2px dashed #3a4250;
  color: #5a6570;
  transition: all 0.15s;
}

.channel-strip-add:hover {
  background: #252a32;
  border-color: #4a90b8;
  color: #4a90b8;
}

.channel-strip-add .add-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.channel-strip-add .add-text {
  font-size: 10px;
}

.channel-header {
  padding: 4px;
  border-radius: 2px;
  margin-bottom: 8px;
}

.channel-name {
  width: 100%;
  background: transparent;
  border: none;
  color: white;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
  padding: 2px;
  border-radius: 2px;
}

.channel-name:focus {
  background: rgba(0,0,0,0.3);
  outline: none;
}

.channel-btn-row {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.channel-btn {
  flex: 1;
  padding: 4px;
  border: none;
  border-radius: 2px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.channel-btn.mute {
  background: #3a4250;
  color: #888;
}

.channel-btn.mute.active {
  background: #e06040;
  color: white;
}

.channel-btn.solo {
  background: #3a4250;
  color: #888;
}

.channel-btn.solo.active {
  background: #e0c040;
  color: #333;
}

.channel-volume-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 8px;
}

.channel-volume {
  writing-mode: vertical-lr;
  direction: rtl;
  width: 100px;
  height: 8px;
  -webkit-appearance: none;
  background: #3a4250;
  border-radius: 4px;
  margin-bottom: 4px;
}

.channel-volume::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #4a90b8;
  border-radius: 50%;
  cursor: pointer;
}

.channel-volume-label {
  font-size: 9px;
  color: #888;
}

.channel-pan-container {
  margin-bottom: 8px;
}

.channel-pan-label {
  font-size: 9px;
  color: #666;
  text-align: center;
  margin-bottom: 2px;
}

.channel-pan {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  background: #3a4250;
  border-radius: 3px;
}

.channel-pan::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  background: #50b860;
  border-radius: 50%;
  cursor: pointer;
}

.channel-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.channel-strip:hover .channel-delete {
  opacity: 1;
}

.channel-delete:hover {
  color: #e06040;
}
`;
