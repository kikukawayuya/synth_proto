/**
 * JITAI Audio Parameter Visualization Panel
 * JITAIによって変化する音響パラメータをリアルタイムで可視化
 */
import { JitaiController } from '../jitai/JitaiController';
import { AudioParameters } from '../jitai/AudioParameters';

export const jitaiVisualizationStyles = `
.jitai-viz-panel {
    background: linear-gradient(135deg, #1a2530 0%, #0d1520 100%);
    border: 1px solid #3a5570;
    border-radius: 12px;
    padding: 20px;
    color: #c8d4e0;
    font-family: 'SF Pro Display', -apple-system, sans-serif;
}

.jitai-viz-title {
    font-size: 16px;
    font-weight: 600;
    color: #4a90b8;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.jitai-viz-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
}

.jitai-viz-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #2a3540;
    border-radius: 10px;
    padding: 16px;
    transition: all 0.3s ease;
}

.jitai-viz-card.highlight {
    border-color: #4a90b8;
    box-shadow: 0 0 20px rgba(74, 144, 184, 0.3);
}

.jitai-viz-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.jitai-viz-card-title {
    font-size: 11px;
    font-weight: 600;
    color: #6a8aa8;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.jitai-viz-card-value {
    font-size: 24px;
    font-weight: 700;
    color: #4a90b8;
    font-family: 'SF Mono', monospace;
}

.jitai-viz-card-unit {
    font-size: 12px;
    color: #6a8aa8;
    margin-left: 4px;
}

.jitai-viz-bar-container {
    height: 8px;
    background: #1a2530;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 8px;
}

.jitai-viz-bar {
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s ease, background 0.5s ease;
}

.jitai-viz-bar.filter {
    background: linear-gradient(90deg, #4a90b8 0%, #6ab0d8 100%);
}

.jitai-viz-bar.lfo {
    background: linear-gradient(90deg, #50b860 0%, #70d880 100%);
}

.jitai-viz-bar.envelope {
    background: linear-gradient(90deg, #b060c0 0%, #d080e0 100%);
}

.jitai-viz-bar.reverb {
    background: linear-gradient(90deg, #e0a040 0%, #f0c060 100%);
}

.jitai-viz-bar.chorus {
    background: linear-gradient(90deg, #60b0b0 0%, #80d0d0 100%);
}

.jitai-viz-bar.tempo {
    background: linear-gradient(90deg, #e06040 0%, #f08060 100%);
}

.jitai-viz-description {
    font-size: 10px;
    color: #5a6a7a;
    margin-top: 8px;
    line-height: 1.4;
}

.jitai-viz-change-indicator {
    display: inline-block;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    margin-left: 8px;
}

.jitai-viz-change-indicator.up {
    background: rgba(80, 184, 96, 0.2);
    color: #50b860;
}

.jitai-viz-change-indicator.down {
    background: rgba(224, 96, 64, 0.2);
    color: #e06040;
}

.jitai-viz-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #2a3540;
}

.jitai-viz-section-title {
    font-size: 12px;
    font-weight: 600;
    color: #8a9aa8;
    margin-bottom: 12px;
}

.jitai-viz-mini-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
}

.jitai-viz-mini-card {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    padding: 8px;
    text-align: center;
}

.jitai-viz-mini-label {
    font-size: 9px;
    color: #5a6a7a;
    margin-bottom: 4px;
}

.jitai-viz-mini-value {
    font-size: 14px;
    font-weight: 600;
    color: #a0b0c0;
    font-family: 'SF Mono', monospace;
}
`;

interface VisualizationCard {
    id: string;
    title: string;
    unit: string;
    barClass: string;
    description: string;
    getValue: (audio: AudioParameters, relaxation: number, sleepiness: number) => number;
    getDisplay: (value: number) => string;
    getPercentage: (value: number) => number;
}

const VISUALIZATION_CARDS: VisualizationCard[] = [
    {
        id: 'filter',
        title: 'Filter Cutoff',
        unit: 'Hz',
        barClass: 'filter',
        description: 'リラックス度が上がると暗い音色に',
        getValue: (_, relaxation) => Math.max(400, 2000 - relaxation * 1600),
        getDisplay: (v) => Math.round(v).toString(),
        getPercentage: (v) => ((v - 400) / 1600) * 100
    },
    {
        id: 'lfoRate',
        title: 'LFO Speed',
        unit: 'Hz',
        barClass: 'lfo',
        description: 'リラックス度が上がるとゆらぎがゆっくり',
        getValue: (_, relaxation) => 0.05 + (1 - relaxation) * 0.15,
        getDisplay: (v) => v.toFixed(2),
        getPercentage: (v) => ((v - 0.05) / 0.15) * 100
    },
    {
        id: 'attack',
        title: 'Attack Time',
        unit: 's',
        barClass: 'envelope',
        description: '眠気に応じてアタックが長く柔らかく',
        getValue: (_, __, sleepiness) => 1 + sleepiness * 8,
        getDisplay: (v) => v.toFixed(1),
        getPercentage: (v) => ((v - 1) / 8) * 100
    },
    {
        id: 'release',
        title: 'Release Time',
        unit: 's',
        barClass: 'envelope',
        description: '眠気に応じてリリースが長く残響感',
        getValue: (_, __, sleepiness) => 2 + sleepiness * 10,
        getDisplay: (v) => v.toFixed(1),
        getPercentage: (v) => ((v - 2) / 10) * 100
    },
    {
        id: 'reverb',
        title: 'Reverb Mix',
        unit: '%',
        barClass: 'reverb',
        description: '眠気に応じて空間が広く深く',
        getValue: (_, __, sleepiness) => (0.2 + sleepiness * 0.4) * 100,
        getDisplay: (v) => Math.round(v).toString(),
        getPercentage: (v) => ((v - 20) / 40) * 100
    },
    {
        id: 'bpm',
        title: 'Tempo',
        unit: 'BPM',
        barClass: 'tempo',
        description: '眠気に応じてテンポがゆっくり',
        getValue: (_, __, sleepiness) => 120 - sleepiness * 60,
        getDisplay: (v) => Math.round(v).toString(),
        getPercentage: (v) => ((120 - v) / 60) * 100
    }
];

export class JitaiVisualization {
    private container: HTMLElement;
    private controller: JitaiController;
    private cards: Map<string, {
        valueEl: HTMLElement;
        barEl: HTMLElement;
        cardEl: HTMLElement;
    }> = new Map();
    private previousValues: Map<string, number> = new Map();

    constructor(controller: JitaiController) {
        this.controller = controller;
        this.container = document.createElement('div');
        this.container.className = 'jitai-viz-panel';

        this.render();
        this.setupListeners();
    }

    getElement(): HTMLElement {
        return this.container;
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="jitai-viz-title">
                <span>🎵</span>
                <span>JITAI Audio Parameters</span>
            </div>
            <div class="jitai-viz-grid" id="jitai-viz-grid">
                ${VISUALIZATION_CARDS.map(card => `
                    <div class="jitai-viz-card" id="jitai-card-${card.id}">
                        <div class="jitai-viz-card-header">
                            <span class="jitai-viz-card-title">${card.title}</span>
                        </div>
                        <div>
                            <span class="jitai-viz-card-value" id="jitai-value-${card.id}">--</span>
                            <span class="jitai-viz-card-unit">${card.unit}</span>
                        </div>
                        <div class="jitai-viz-bar-container">
                            <div class="jitai-viz-bar ${card.barClass}" id="jitai-bar-${card.id}" style="width: 50%"></div>
                        </div>
                        <div class="jitai-viz-description">${card.description}</div>
                    </div>
                `).join('')}
            </div>
            <div class="jitai-viz-section">
                <div class="jitai-viz-section-title">Current State Summary</div>
                <div class="jitai-viz-mini-grid">
                    <div class="jitai-viz-mini-card">
                        <div class="jitai-viz-mini-label">Relaxation</div>
                        <div class="jitai-viz-mini-value" id="jitai-mini-relax">0.50</div>
                    </div>
                    <div class="jitai-viz-mini-card">
                        <div class="jitai-viz-mini-label">Sleepiness</div>
                        <div class="jitai-viz-mini-value" id="jitai-mini-sleep">0.40</div>
                    </div>
                    <div class="jitai-viz-mini-card">
                        <div class="jitai-viz-mini-label">Heart Rate</div>
                        <div class="jitai-viz-mini-value" id="jitai-mini-hr">70</div>
                    </div>
                    <div class="jitai-viz-mini-card">
                        <div class="jitai-viz-mini-label">HRV</div>
                        <div class="jitai-viz-mini-value" id="jitai-mini-hrv">40</div>
                    </div>
                    <div class="jitai-viz-mini-card">
                        <div class="jitai-viz-mini-label">Stress</div>
                        <div class="jitai-viz-mini-value" id="jitai-mini-stress">5.0</div>
                    </div>
                    <div class="jitai-viz-mini-card">
                        <div class="jitai-viz-mini-label">To Bed</div>
                        <div class="jitai-viz-mini-value" id="jitai-mini-bed">30m</div>
                    </div>
                </div>
            </div>
        `;

        // Cache card elements
        VISUALIZATION_CARDS.forEach(card => {
            const valueEl = this.container.querySelector(`#jitai-value-${card.id}`) as HTMLElement;
            const barEl = this.container.querySelector(`#jitai-bar-${card.id}`) as HTMLElement;
            const cardEl = this.container.querySelector(`#jitai-card-${card.id}`) as HTMLElement;
            if (valueEl && barEl && cardEl) {
                this.cards.set(card.id, { valueEl, barEl, cardEl });
            }
        });

        this.updateDisplay();
    }

    private setupListeners(): void {
        this.controller.setOnChange(() => {
            this.updateDisplay();
        });
    }

    private updateDisplay(): void {
        const audio = this.controller.getAudioParams();
        const relaxation = this.controller.getRelaxation();
        const sleepiness = this.controller.getSleepReadiness();
        const input = this.controller.getInputParams();

        // Update main cards
        VISUALIZATION_CARDS.forEach(card => {
            const elements = this.cards.get(card.id);
            if (!elements) return;

            const value = card.getValue(audio, relaxation, sleepiness);
            const percentage = Math.max(0, Math.min(100, card.getPercentage(value)));
            const previousValue = this.previousValues.get(card.id);

            elements.valueEl.textContent = card.getDisplay(value);
            elements.barEl.style.width = `${percentage}%`;

            // Highlight card on change
            if (previousValue !== undefined && Math.abs(value - previousValue) > 0.01) {
                elements.cardEl.classList.add('highlight');
                setTimeout(() => elements.cardEl.classList.remove('highlight'), 500);
            }

            this.previousValues.set(card.id, value);
        });

        // Update mini summary
        const miniRelax = this.container.querySelector('#jitai-mini-relax');
        const miniSleep = this.container.querySelector('#jitai-mini-sleep');
        const miniHr = this.container.querySelector('#jitai-mini-hr');
        const miniHrv = this.container.querySelector('#jitai-mini-hrv');
        const miniStress = this.container.querySelector('#jitai-mini-stress');
        const miniBed = this.container.querySelector('#jitai-mini-bed');

        if (miniRelax) miniRelax.textContent = relaxation.toFixed(2);
        if (miniSleep) miniSleep.textContent = sleepiness.toFixed(2);
        if (miniHr) miniHr.textContent = Math.round(input.heartRate).toString();
        if (miniHrv) miniHrv.textContent = Math.round(input.hrvRmssd).toString();
        if (miniStress) miniStress.textContent = input.selfReportedStress.toFixed(1);
        if (miniBed) {
            const mins = Math.round(input.minutesToBedtime);
            miniBed.textContent = mins <= 0 ? '0m' : `${mins}m`;
        }
    }
}
