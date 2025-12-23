/**
 * JITAI研究用コントローラー
 * インプットパラメータの管理、マッピング、シンセへの適用を統合
 */
import {
    InterventionParameters,
    DEFAULT_INTERVENTION_PARAMS,
    HIGH_STRESS_PRESET,
    RELAXED_PRESET,
    PRE_SLEEP_PRESET,
    estimateRelaxation,
    estimateSleepReadiness
} from './InterventionParameters';
import { AudioParameters } from './AudioParameters';
import { ParameterMapper, MappingMode } from './ParameterMapper';
import { ChannelManager } from '../channel/ChannelManager';

export class JitaiController {
    private inputParams: InterventionParameters;
    private audioParams: AudioParameters;
    private mapper: ParameterMapper;
    private channelManager: ChannelManager;
    private updateInterval: number = 100; // ms
    private simulationTimer: number | null = null;
    private onChangeCallback: ((input: InterventionParameters, audio: AudioParameters) => void) | null = null;

    constructor(channelManager: ChannelManager) {
        this.channelManager = channelManager;
        this.mapper = new ParameterMapper();
        this.inputParams = { ...DEFAULT_INTERVENTION_PARAMS };
        this.audioParams = this.mapper.map(this.inputParams);
    }

    // MARK: - Getters

    getInputParams(): InterventionParameters {
        return { ...this.inputParams };
    }

    getAudioParams(): AudioParameters {
        return { ...this.audioParams };
    }

    getRelaxation(): number {
        return estimateRelaxation(this.inputParams);
    }

    getSleepReadiness(): number {
        return estimateSleepReadiness(this.inputParams);
    }

    // MARK: - Setters

    setMappingMode(mode: MappingMode): void {
        this.mapper.mode = mode;
        this.updateAudioParams();
    }

    setOnChange(callback: (input: InterventionParameters, audio: AudioParameters) => void): void {
        this.onChangeCallback = callback;
    }

    // MARK: - パラメータ更新

    /**
     * 単一パラメータを更新
     */
    setParam<K extends keyof InterventionParameters>(key: K, value: InterventionParameters[K]): void {
        this.inputParams[key] = value;
        this.updateAudioParams();
    }

    /**
     * 複数パラメータを一括更新
     */
    setParams(params: Partial<InterventionParameters>): void {
        Object.assign(this.inputParams, params);
        this.updateAudioParams();
    }

    /**
     * 音響パラメータを再計算してシンセに適用
     */
    private updateAudioParams(): void {
        this.audioParams = this.mapper.map(this.inputParams);
        this.applyToSynth();

        if (this.onChangeCallback) {
            this.onChangeCallback(this.inputParams, this.audioParams);
        }
    }

    /**
     * シンセにパラメータを適用
     */
    private applyToSynth(): void {
        const channels = this.channelManager.getAllChannels();

        channels.forEach(channel => {
            const synth = channel.getSynth();

            // フィルター関連
            synth.setParam('filterCutoff', this.audioParams.droneFilterCutoff);

            // LFO関連
            synth.setParam('lfo1Rate', this.audioParams.filterLfoRate);
            synth.setParam('lfo1Amount', this.audioParams.filterLfoDepth);

            // エンベロープ
            synth.setParam('ampAttack', this.audioParams.attackDuration);
            synth.setParam('ampRelease', this.audioParams.releaseDuration);

            // エフェクト
            synth.setParam('reverbMix', this.audioParams.reverbMix / 100);
            synth.setParam('chorusMix', this.audioParams.chorusMix);
            synth.setParam('chorusRate', this.audioParams.chorusRate);
        });

        // BPMを睡眠準備度に応じて調整（オプション）
        const sleepiness = this.getSleepReadiness();
        const bpm = Math.round(120 - sleepiness * 84); // 120→36
        this.channelManager.setBpm(bpm);
    }

    // MARK: - プリセット

    applyHighStressPreset(): void {
        this.inputParams = { ...HIGH_STRESS_PRESET };
        this.updateAudioParams();
    }

    applyRelaxedPreset(): void {
        this.inputParams = { ...RELAXED_PRESET };
        this.updateAudioParams();
    }

    applyPreSleepPreset(): void {
        this.inputParams = { ...PRE_SLEEP_PRESET };
        this.updateAudioParams();
    }

    applyDefaultPreset(): void {
        this.inputParams = { ...DEFAULT_INTERVENTION_PARAMS };
        this.updateAudioParams();
    }

    // MARK: - シミュレーション

    /**
     * 時間経過シミュレーションを開始
     */
    startSimulation(speed: number = 10): void {
        this.stopSimulation();

        this.simulationTimer = window.setInterval(() => {
            // 就寝時刻に近づく
            if (this.inputParams.minutesToBedtime > 0) {
                this.inputParams.minutesToBedtime -= speed * (this.updateInterval / 60000);
            }

            // 徐々にリラックス
            if (this.inputParams.heartRate > 55) {
                this.inputParams.heartRate -= 0.05 * speed;
            }
            if (this.inputParams.hrvRmssd < 70) {
                this.inputParams.hrvRmssd += 0.1 * speed;
            }

            // 眠気上昇
            if (this.inputParams.selfReportedSleepiness < 9) {
                this.inputParams.selfReportedSleepiness += 0.02 * speed;
            }

            // ストレス低下
            if (this.inputParams.selfReportedStress > 1) {
                this.inputParams.selfReportedStress -= 0.01 * speed;
            }

            this.updateAudioParams();
        }, this.updateInterval);
    }

    /**
     * シミュレーションを停止
     */
    stopSimulation(): void {
        if (this.simulationTimer !== null) {
            clearInterval(this.simulationTimer);
            this.simulationTimer = null;
        }
    }

    isSimulating(): boolean {
        return this.simulationTimer !== null;
    }

    // MARK: - デバッグ

    printDebug(): void {
        console.log(this.mapper.debugDescription(this.inputParams));
    }
}
