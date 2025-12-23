/**
 * Master Section UI - Volume and 3-band EQ
 */
import { ChannelManager } from '../channel/ChannelManager';

export const masterSectionStyles = `
.master-section {
    position: fixed;
    left: 20px;
    top: 80px;
    width: 180px;
    background: linear-gradient(135deg, #1a2530 0%, #0d1520 100%);
    border: 1px solid #3a5570;
    border-radius: 12px;
    padding: 16px;
    z-index: 1000;
    font-family: 'SF Pro Display', -apple-system, sans-serif;
    color: #c8d4e0;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.master-section.collapsed {
    width: auto;
    padding: 8px 12px;
}

.master-section.collapsed .master-content {
    display: none;
}

.master-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #3a5570;
}

.master-title {
    font-size: 14px;
    font-weight: 600;
    color: #4a90b8;
    display: flex;
    align-items: center;
    gap: 8px;
}

.master-toggle-btn {
    background: none;
    border: none;
    color: #6a8aa8;
    cursor: pointer;
    font-size: 18px;
    padding: 4px;
}

.master-volume-section {
    margin-bottom: 16px;
}

.master-volume-label {
    font-size: 11px;
    color: #6a8aa8;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
}

.master-volume-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.master-volume-slider {
    flex: 1;
    height: 8px;
    -webkit-appearance: none;
    background: linear-gradient(to right, #2a3540, #4a90b8);
    border-radius: 4px;
    outline: none;
}

.master-volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #5aa0c8 0%, #3a7098 100%);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    border: 2px solid #6ab0d8;
}

.master-volume-value {
    font-size: 14px;
    font-weight: 600;
    color: #4a90b8;
    text-align: center;
    font-family: 'SF Mono', monospace;
}

.master-eq-section {
    margin-bottom: 8px;
}

.master-eq-label {
    font-size: 11px;
    color: #6a8aa8;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
}

.eq-bands {
    display: flex;
    justify-content: space-around;
    gap: 4px;
}

.eq-band {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 45px;
}

.eq-band-label {
    font-size: 10px;
    color: #6a8aa8;
    margin-bottom: 4px;
}

.eq-slider-container {
    height: 70px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.eq-slider {
    -webkit-appearance: none;
    width: 60px;
    height: 6px;
    background: linear-gradient(to right, #c06060, #2a3540 50%, #60c060);
    border-radius: 3px;
    outline: none;
    transform: rotate(-90deg);
    position: absolute;
}

.eq-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: linear-gradient(135deg, #4a90b8 0%, #3a7098 100%);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.eq-value {
    font-size: 10px;
    color: #4a90b8;
    font-family: 'SF Mono', monospace;
    margin-top: 6px;
}

.master-meter {
    height: 8px;
    background: #1a2530;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 12px;
}

.master-meter-fill {
    height: 100%;
    background: linear-gradient(to right, #4a90b8 0%, #60c080 60%, #e0a040 80%, #e06040 100%);
    border-radius: 4px;
    transition: width 0.05s ease;
    width: 0%;
}

.master-reset-btn {
    width: 100%;
    margin-top: 10px;
    background: #2a3540;
    border: 1px solid #3a5570;
    border-radius: 6px;
    padding: 6px;
    font-size: 11px;
    color: #6a8aa8;
    cursor: pointer;
    transition: all 0.2s;
}

.master-reset-btn:hover {
    background: #3a4550;
    color: #a0b0c0;
}
`;

export class MasterSection {
    private container: HTMLElement;
    private channelManager: ChannelManager;
    private isCollapsed: boolean = false;
    private volumeSlider: HTMLInputElement | null = null;
    private volumeValue: HTMLElement | null = null;
    private eqSliders: Map<string, HTMLInputElement> = new Map();
    private eqValues: Map<string, HTMLElement> = new Map();
    private meterFill: HTMLElement | null = null;
    private animationFrame: number | null = null;

    constructor(channelManager: ChannelManager) {
        this.channelManager = channelManager;
        this.container = document.createElement('div');
        this.container.className = 'master-section';

        this.render();
        this.setupListeners();
        this.startMeter();
    }

    getElement(): HTMLElement {
        return this.container;
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="master-header">
                <div class="master-title">
                    <span>🔊</span>
                    <span>Master</span>
                </div>
                <button class="master-toggle-btn">−</button>
            </div>
            <div class="master-content">
                <div class="master-volume-section">
                    <div class="master-volume-label">Volume</div>
                    <div class="master-volume-container">
                        <input type="range" class="master-volume-slider" min="0" max="4" step="0.01" value="1.5">
                    </div>
                    <span class="master-volume-value">150%</span>
                </div>

                <div class="master-eq-section">
                    <div class="master-eq-label">3-Band EQ</div>
                    <div class="eq-bands">
                        <div class="eq-band">
                            <span class="eq-band-label">Low</span>
                            <div class="eq-slider-container">
                                <input type="range" class="eq-slider" data-band="low" min="-12" max="12" step="0.5" value="0">
                            </div>
                            <span class="eq-value" data-band="low">0 dB</span>
                        </div>
                        <div class="eq-band">
                            <span class="eq-band-label">Mid</span>
                            <div class="eq-slider-container">
                                <input type="range" class="eq-slider" data-band="mid" min="-12" max="12" step="0.5" value="0">
                            </div>
                            <span class="eq-value" data-band="mid">0 dB</span>
                        </div>
                        <div class="eq-band">
                            <span class="eq-band-label">High</span>
                            <div class="eq-slider-container">
                                <input type="range" class="eq-slider" data-band="high" min="-12" max="12" step="0.5" value="0">
                            </div>
                            <span class="eq-value" data-band="high">0 dB</span>
                        </div>
                    </div>
                </div>

                <div class="master-meter">
                    <div class="master-meter-fill"></div>
                </div>

                <button class="master-reset-btn">Reset EQ</button>
            </div>
        `;

        // Cache elements
        this.volumeSlider = this.container.querySelector('.master-volume-slider');
        this.volumeValue = this.container.querySelector('.master-volume-value');
        this.meterFill = this.container.querySelector('.master-meter-fill');

        this.container.querySelectorAll('.eq-slider').forEach(slider => {
            const input = slider as HTMLInputElement;
            const band = input.dataset.band!;
            this.eqSliders.set(band, input);
        });

        this.container.querySelectorAll('.eq-value').forEach(el => {
            const span = el as HTMLElement;
            const band = span.dataset.band!;
            this.eqValues.set(band, span);
        });
    }

    private setupListeners(): void {
        // Toggle collapse
        const toggleBtn = this.container.querySelector('.master-toggle-btn');
        toggleBtn?.addEventListener('click', () => {
            this.isCollapsed = !this.isCollapsed;
            this.container.classList.toggle('collapsed', this.isCollapsed);
            toggleBtn.textContent = this.isCollapsed ? '+' : '−';
        });

        // Volume slider
        this.volumeSlider?.addEventListener('input', () => {
            const value = parseFloat(this.volumeSlider!.value);
            this.channelManager.setMasterVolume(value);
            this.updateVolumeDisplay(value);
        });

        // EQ sliders
        this.eqSliders.forEach((slider, band) => {
            slider.addEventListener('input', () => {
                const value = parseFloat(slider.value);
                this.channelManager.setEqBand(band as 'low' | 'mid' | 'high', value);
                this.updateEqDisplay(band, value);
            });
        });

        // Reset button
        const resetBtn = this.container.querySelector('.master-reset-btn');
        resetBtn?.addEventListener('click', () => {
            this.resetEq();
        });
    }

    private updateVolumeDisplay(value: number): void {
        if (this.volumeValue) {
            this.volumeValue.textContent = `${Math.round(value * 100)}%`;
        }
    }

    private updateEqDisplay(band: string, value: number): void {
        const display = this.eqValues.get(band);
        if (display) {
            const sign = value > 0 ? '+' : '';
            display.textContent = `${sign}${value.toFixed(1)} dB`;
        }
    }

    private resetEq(): void {
        ['low', 'mid', 'high'].forEach(band => {
            this.channelManager.setEqBand(band as 'low' | 'mid' | 'high', 0);
            const slider = this.eqSliders.get(band);
            if (slider) slider.value = '0';
            this.updateEqDisplay(band, 0);
        });
    }

    private startMeter(): void {
        const updateMeter = () => {
            const analyser = this.channelManager.getMasterAnalyser();
            if (analyser && this.meterFill) {
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(dataArray);

                // Calculate RMS level
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i] * dataArray[i];
                }
                const rms = Math.sqrt(sum / dataArray.length);
                const level = Math.min(100, (rms / 128) * 100);

                this.meterFill.style.width = `${level}%`;
            }

            this.animationFrame = requestAnimationFrame(updateMeter);
        };

        updateMeter();
    }

    destroy(): void {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}
