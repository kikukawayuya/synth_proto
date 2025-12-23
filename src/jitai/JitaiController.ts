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
     * プリセット変更が音楽的に明確に聞こえるように設計
     * 発振防止のため全パラメータを安全な範囲に制限
     */
    private applyToSynth(): void {
        const channels = this.channelManager.getAllChannels();
        const relaxation = this.getRelaxation();
        const sleepiness = this.getSleepReadiness();

        channels.forEach(channel => {
            const synth = channel.getSynth();

            // フィルターカットオフ: リラックス度に応じて変化 (1800Hz → 600Hz)
            // 発振防止のため最低値を600Hzに引き上げ
            const cutoff = Math.max(600, 1800 - relaxation * 1200);
            synth.setParam('filterCutoff', cutoff);

            // フィルターレゾナンス: 発振防止のため非常に低い値に制限 (0.0 - 0.05)
            // 高いレゾナンスは低カットオフと組み合わさると発振の原因になる
            synth.setParam('filterRes', 0.0 + relaxation * 0.05);

            // LFO: pan（パン）をターゲットに変更。フィルターへの変調は発振の原因になりやすい
            synth.setParam('lfo1Rate', 0.1 + (1 - relaxation) * 0.2);  // 0.1-0.3 Hz
            synth.setParam('lfo1Amount', 0.1 + relaxation * 0.1);      // 控えめな深さ
            synth.setParam('lfo1Target', 'pan');  // フィルターではなくパンに変更

            // エンベロープ: 眠気に応じてアタック/リリースを長く
            // 極端に長いエンベロープも発振の原因になるため制限
            const attack = 1 + sleepiness * 5;   // 1秒 → 6秒 (9秒から短縮)
            const release = 2 + sleepiness * 6;  // 2秒 → 8秒 (12秒から短縮)
            synth.setParam('ampAttack', attack);
            synth.setParam('ampRelease', release);

            // エフェクト: 眠気に応じてリバーブを深く
            // リバーブも過度なフィードバック防止のため制限
            const reverbMix = 0.15 + sleepiness * 0.25;  // 15% → 40%
            synth.setParam('longReverbDryWet', reverbMix);
            synth.setParam('longReverbDecay', 3 + sleepiness * 6);  // 3秒 → 9秒

            // コーラス: リラックス度に応じて深く (控えめに)
            synth.setParam('chorusMix', 0.08 + relaxation * 0.15);  // 8% → 23%
            synth.setParam('chorusRate', 0.25 - relaxation * 0.1);  // ゆっくりに
        });

        // BPMを睡眠準備度に応じて調整（60-120の範囲で）
        const bpm = Math.round(120 - sleepiness * 60); // 120→60 (最低60BPMを維持)
        this.channelManager.setBpm(bpm);

        // UIのBPM表示も更新
        const bpmInput = document.getElementById('bpm') as HTMLInputElement;
        if (bpmInput) {
            bpmInput.value = String(bpm);
        }
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
