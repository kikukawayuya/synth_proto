/**
 * JITAI研究用パラメータパネルUI
 * スライダーでインプットパラメータを操作し、リアルタイムに音響が変化
 */
import { JitaiController } from './JitaiController';
import { InterventionParameters } from './InterventionParameters';
import { AudioParameters } from './AudioParameters';

export const jitaiPanelStyles = `
.jitai-panel {
    position: fixed;
    right: 20px;
    top: 80px;
    width: 320px;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    background: linear-gradient(135deg, #1a2530 0%, #0d1520 100%);
    border: 1px solid #3a5570;
    border-radius: 12px;
    padding: 16px;
    z-index: 1000;
    font-family: 'SF Pro Display', -apple-system, sans-serif;
    color: #c8d4e0;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.jitai-panel.collapsed {
    width: auto;
    max-height: none;
    padding: 8px 12px;
}

.jitai-panel.collapsed .jitai-content {
    display: none;
}

.jitai-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #3a5570;
}

.jitai-title {
    font-size: 14px;
    font-weight: 600;
    color: #4a90b8;
    display: flex;
    align-items: center;
    gap: 8px;
}

.jitai-toggle-btn {
    background: none;
    border: none;
    color: #6a8aa8;
    cursor: pointer;
    font-size: 18px;
    padding: 4px;
}

.jitai-section {
    margin-bottom: 16px;
}

.jitai-section-title {
    font-size: 11px;
    font-weight: 600;
    color: #6a8aa8;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
}

.jitai-param {
    margin-bottom: 10px;
}

.jitai-param-header {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    margin-bottom: 4px;
}

.jitai-param-label {
    color: #a0b0c0;
}

.jitai-param-value {
    color: #4a90b8;
    font-weight: 500;
    font-family: 'SF Mono', monospace;
}

.jitai-slider {
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    background: #2a3540;
    border-radius: 3px;
    outline: none;
}

.jitai-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: linear-gradient(135deg, #4a90b8 0%, #3a7098 100%);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.jitai-slider::-webkit-slider-thumb:hover {
    background: linear-gradient(135deg, #5aa0c8 0%, #4a80a8 100%);
}

.jitai-indicators {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
}

.jitai-indicator {
    background: #1a2530;
    border: 1px solid #2a3540;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
}

.jitai-indicator-label {
    font-size: 10px;
    color: #6a8aa8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.jitai-indicator-value {
    font-size: 20px;
    font-weight: 600;
    color: #4a90b8;
    margin-top: 4px;
}

.jitai-indicator-bar {
    height: 4px;
    background: #2a3540;
    border-radius: 2px;
    margin-top: 6px;
    overflow: hidden;
}

.jitai-indicator-fill {
    height: 100%;
    background: linear-gradient(90deg, #4a90b8 0%, #6ab0d8 100%);
    border-radius: 2px;
    transition: width 0.3s ease;
}

.jitai-presets {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    margin-bottom: 12px;
}

.jitai-preset-btn {
    background: #2a3540;
    border: 1px solid #3a5570;
    border-radius: 6px;
    padding: 8px;
    font-size: 11px;
    color: #a0b0c0;
    cursor: pointer;
    transition: all 0.2s;
}

.jitai-preset-btn:hover {
    background: #3a4550;
    color: #c8d4e0;
}

.jitai-preset-btn.active {
    background: #4a90b8;
    color: white;
    border-color: #5aa0c8;
}

.jitai-simulation {
    display: flex;
    gap: 8px;
}

.jitai-sim-btn {
    flex: 1;
    background: #2a3540;
    border: 1px solid #3a5570;
    border-radius: 6px;
    padding: 10px;
    font-size: 12px;
    color: #a0b0c0;
    cursor: pointer;
    transition: all 0.2s;
}

.jitai-sim-btn:hover {
    background: #3a4550;
}

.jitai-sim-btn.running {
    background: #4a90b8;
    color: white;
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.jitai-output {
    background: #0d1520;
    border: 1px solid #2a3540;
    border-radius: 6px;
    padding: 10px;
    font-size: 10px;
    font-family: 'SF Mono', monospace;
    color: #6a8aa8;
    max-height: 150px;
    overflow-y: auto;
    white-space: pre-wrap;
}
`;

interface ParamConfig {
    key: keyof InterventionParameters;
    label: string;
    min: number;
    max: number;
    step: number;
    unit: string;
}

const PHYSIOLOGICAL_PARAMS: ParamConfig[] = [
    { key: 'heartRate', label: 'Heart Rate', min: 40, max: 120, step: 1, unit: 'bpm' },
    { key: 'hrvRmssd', label: 'HRV (RMSSD)', min: 10, max: 100, step: 1, unit: 'ms' },
    { key: 'selfReportedStress', label: 'Stress Level', min: 0, max: 10, step: 0.5, unit: '/10' },
    { key: 'selfReportedSleepiness', label: 'Sleepiness', min: 0, max: 10, step: 0.5, unit: '/10' },
];

const ENVIRONMENTAL_PARAMS: ParamConfig[] = [
    { key: 'roomTemperature', label: 'Room Temp', min: 15, max: 30, step: 0.5, unit: '°C' },
    { key: 'humidity', label: 'Humidity', min: 20, max: 80, step: 1, unit: '%' },
    { key: 'minutesToBedtime', label: 'To Bedtime', min: -30, max: 180, step: 5, unit: 'min' },
];

const BEHAVIORAL_PARAMS: ParamConfig[] = [
    { key: 'previousSleepHours', label: 'Last Night Sleep', min: 3, max: 12, step: 0.5, unit: 'hrs' },
    { key: 'stepsToday', label: 'Steps Today', min: 0, max: 20000, step: 500, unit: '' },
];

export class JitaiPanel {
    private container: HTMLElement;
    private controller: JitaiController;
    private isCollapsed: boolean = false;
    private sliders: Map<string, HTMLInputElement> = new Map();
    private valueDisplays: Map<string, HTMLElement> = new Map();
    private relaxationFill: HTMLElement | null = null;
    private sleepReadinessFill: HTMLElement | null = null;
    private relaxationValue: HTMLElement | null = null;
    private sleepReadinessValue: HTMLElement | null = null;
    private outputEl: HTMLElement | null = null;
    private simBtn: HTMLButtonElement | null = null;

    constructor(controller: JitaiController) {
        this.controller = controller;
        this.container = document.createElement('div');
        this.container.className = 'jitai-panel';

        this.render();
        this.setupListeners();
    }

    getElement(): HTMLElement {
        return this.container;
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="jitai-header">
                <div class="jitai-title">
                    <span>🧠</span>
                    <span>JITAI Research Panel</span>
                </div>
                <button class="jitai-toggle-btn">−</button>
            </div>
            <div class="jitai-content">
                <div class="jitai-indicators">
                    <div class="jitai-indicator">
                        <div class="jitai-indicator-label">Relaxation</div>
                        <div class="jitai-indicator-value" id="jitai-relaxation">0.50</div>
                        <div class="jitai-indicator-bar">
                            <div class="jitai-indicator-fill" id="jitai-relaxation-fill" style="width: 50%"></div>
                        </div>
                    </div>
                    <div class="jitai-indicator">
                        <div class="jitai-indicator-label">Sleep Ready</div>
                        <div class="jitai-indicator-value" id="jitai-sleep-readiness">0.40</div>
                        <div class="jitai-indicator-bar">
                            <div class="jitai-indicator-fill" id="jitai-sleep-fill" style="width: 40%"></div>
                        </div>
                    </div>
                </div>

                <div class="jitai-presets">
                    <button class="jitai-preset-btn" data-preset="default">Default</button>
                    <button class="jitai-preset-btn" data-preset="stress">High Stress</button>
                    <button class="jitai-preset-btn" data-preset="relaxed">Relaxed</button>
                    <button class="jitai-preset-btn" data-preset="presleep">Pre-Sleep</button>
                </div>

                <div class="jitai-section">
                    <div class="jitai-section-title">Physiological</div>
                    ${this.renderParams(PHYSIOLOGICAL_PARAMS)}
                </div>

                <div class="jitai-section">
                    <div class="jitai-section-title">Environmental</div>
                    ${this.renderParams(ENVIRONMENTAL_PARAMS)}
                </div>

                <div class="jitai-section">
                    <div class="jitai-section-title">Behavioral</div>
                    ${this.renderParams(BEHAVIORAL_PARAMS)}
                </div>

                <div class="jitai-section">
                    <div class="jitai-section-title">Simulation</div>
                    <div class="jitai-simulation">
                        <button class="jitai-sim-btn" id="jitai-sim-toggle">▶ Start Simulation</button>
                    </div>
                </div>

                <div class="jitai-section">
                    <div class="jitai-section-title">Audio Output</div>
                    <div class="jitai-output" id="jitai-output">Loading...</div>
                </div>
            </div>
        `;

        // Cache elements
        this.relaxationFill = this.container.querySelector('#jitai-relaxation-fill');
        this.sleepReadinessFill = this.container.querySelector('#jitai-sleep-fill');
        this.relaxationValue = this.container.querySelector('#jitai-relaxation');
        this.sleepReadinessValue = this.container.querySelector('#jitai-sleep-readiness');
        this.outputEl = this.container.querySelector('#jitai-output');
        this.simBtn = this.container.querySelector('#jitai-sim-toggle');

        // Cache sliders and value displays
        this.container.querySelectorAll('.jitai-slider').forEach(slider => {
            const input = slider as HTMLInputElement;
            const key = input.dataset.param!;
            this.sliders.set(key, input);
        });

        this.container.querySelectorAll('.jitai-param-value').forEach(el => {
            const key = el.id.replace('jitai-value-', '');
            this.valueDisplays.set(key, el as HTMLElement);
        });

        this.updateDisplay();
    }

    private renderParams(params: ParamConfig[]): string {
        const inputParams = this.controller.getInputParams();
        return params.map(p => `
            <div class="jitai-param">
                <div class="jitai-param-header">
                    <span class="jitai-param-label">${p.label}</span>
                    <span class="jitai-param-value" id="jitai-value-${p.key}">${this.formatValue(inputParams[p.key], p)}</span>
                </div>
                <input type="range" class="jitai-slider" data-param="${p.key}"
                    min="${p.min}" max="${p.max}" step="${p.step}"
                    value="${inputParams[p.key]}">
            </div>
        `).join('');
    }

    private formatValue(value: number, config: ParamConfig): string {
        if (config.key === 'stepsToday') {
            return value.toLocaleString() + config.unit;
        }
        return value.toFixed(config.step < 1 ? 1 : 0) + config.unit;
    }

    private setupListeners(): void {
        // Toggle collapse
        const toggleBtn = this.container.querySelector('.jitai-toggle-btn');
        toggleBtn?.addEventListener('click', () => {
            this.isCollapsed = !this.isCollapsed;
            this.container.classList.toggle('collapsed', this.isCollapsed);
            toggleBtn.textContent = this.isCollapsed ? '+' : '−';
        });

        // Preset buttons
        this.container.querySelectorAll('.jitai-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = (btn as HTMLElement).dataset.preset;
                switch (preset) {
                    case 'default': this.controller.applyDefaultPreset(); break;
                    case 'stress': this.controller.applyHighStressPreset(); break;
                    case 'relaxed': this.controller.applyRelaxedPreset(); break;
                    case 'presleep': this.controller.applyPreSleepPreset(); break;
                }
                this.syncSlidersFromController();
                this.updateDisplay();
            });
        });

        // Sliders
        this.sliders.forEach((slider, key) => {
            slider.addEventListener('input', () => {
                const value = parseFloat(slider.value);
                this.controller.setParam(key as keyof InterventionParameters, value);
                this.updateDisplay();
            });
        });

        // Simulation toggle
        this.simBtn?.addEventListener('click', () => {
            if (this.controller.isSimulating()) {
                this.controller.stopSimulation();
                this.simBtn!.textContent = '▶ Start Simulation';
                this.simBtn!.classList.remove('running');
            } else {
                this.controller.startSimulation();
                this.simBtn!.textContent = '⏸ Stop Simulation';
                this.simBtn!.classList.add('running');
            }
        });

        // Listen for controller changes
        this.controller.setOnChange(() => {
            this.syncSlidersFromController();
            this.updateDisplay();
        });
    }

    private syncSlidersFromController(): void {
        const params = this.controller.getInputParams();
        this.sliders.forEach((slider, key) => {
            slider.value = String(params[key as keyof InterventionParameters]);
        });
    }

    private updateDisplay(): void {
        const input = this.controller.getInputParams();
        const audio = this.controller.getAudioParams();
        const relaxation = this.controller.getRelaxation();
        const sleepReadiness = this.controller.getSleepReadiness();

        // Update indicators
        if (this.relaxationFill) {
            this.relaxationFill.style.width = `${relaxation * 100}%`;
        }
        if (this.sleepReadinessFill) {
            this.sleepReadinessFill.style.width = `${sleepReadiness * 100}%`;
        }
        if (this.relaxationValue) {
            this.relaxationValue.textContent = relaxation.toFixed(2);
        }
        if (this.sleepReadinessValue) {
            this.sleepReadinessValue.textContent = sleepReadiness.toFixed(2);
        }

        // Update value displays
        const allParams = [...PHYSIOLOGICAL_PARAMS, ...ENVIRONMENTAL_PARAMS, ...BEHAVIORAL_PARAMS];
        allParams.forEach(p => {
            const display = this.valueDisplays.get(p.key);
            if (display) {
                display.textContent = this.formatValue(input[p.key] as number, p);
            }
        });

        // Update output
        if (this.outputEl) {
            this.outputEl.textContent = `
BPM: ${Math.round(120 - sleepReadiness * 84)}
Filter: ${audio.droneFilterCutoff.toFixed(0)} Hz
LFO: ${audio.filterLfoRate.toFixed(3)} Hz
Reverb: ${audio.reverbMix.toFixed(0)}%
Volume: ${(audio.masterVolume * 100).toFixed(0)}%
Attack: ${audio.attackDuration.toFixed(1)}s
Binaural: ${audio.binauralBeatFrequency.toFixed(1)} Hz
            `.trim();
        }
    }
}
