/**
 * InterventionParameters（インプット）を AudioParameters（音響出力）に変換するマッパー
 * 研究のコア部分: JITAIの適応ロジックをここで実装
 */
import {
    InterventionParameters,
    estimateRelaxation,
    estimateSleepReadiness
} from './InterventionParameters';
import { AudioParameters, DEFAULT_AUDIO_PARAMS } from './AudioParameters';

export type MappingMode = 'linear' | 'adaptive' | 'experimental';

/**
 * パラメータマッパークラス
 */
export class ParameterMapper {
    mode: MappingMode = 'adaptive';

    /**
     * インプットパラメータを音響パラメータに変換
     */
    map(input: InterventionParameters): AudioParameters {
        switch (this.mode) {
            case 'linear':
                return this.linearMapping(input);
            case 'adaptive':
                return this.adaptiveMapping(input);
            case 'experimental':
                return this.experimentalMapping(input);
            default:
                return this.adaptiveMapping(input);
        }
    }

    /**
     * シンプルな線形マッピング（ベースライン）
     */
    private linearMapping(input: InterventionParameters): AudioParameters {
        const audio = { ...DEFAULT_AUDIO_PARAMS };

        const relaxation = estimateRelaxation(input);
        audio.droneFilterCutoff = this.lerp(1500, 400, relaxation);
        audio.masterLpfCutoff = this.lerp(5000, 2000, relaxation);

        const sleepiness = estimateSleepReadiness(input);
        audio.masterVolume = this.lerp(0.5, 0.3, sleepiness);
        audio.attackDuration = this.lerp(6, 15, sleepiness);

        const stressLevel = input.selfReportedStress / 10.0;
        audio.pinkNoiseMix = this.lerp(0.1, 0.35, stressLevel);

        const hrNormalized = Math.max(0, Math.min(1, (input.heartRate - 50) / 40));
        audio.filterLfoRate = this.lerp(0.015, 0.05, hrNormalized);

        return audio;
    }

    /**
     * ユーザー状態に適応的にマッピング
     */
    private adaptiveMapping(input: InterventionParameters): AudioParameters {
        const audio = { ...DEFAULT_AUDIO_PARAMS };

        const relaxation = estimateRelaxation(input);
        const sleepiness = estimateSleepReadiness(input);
        const stressLevel = input.selfReportedStress / 10.0;

        // --- ドローン設定 ---
        audio.droneBaseFrequency = this.lerp(55, 30, relaxation);
        audio.solfeggioFrequency = this.selectSolfeggioFrequency(stressLevel, sleepiness);
        audio.solfeggioMix = this.lerp(0.2, 0.4, sleepiness);

        // フィルター
        audio.droneFilterCutoff = this.lerp(1200, 350, relaxation);
        audio.filterLfoRate = this.lerp(0.04, 0.015, relaxation);
        audio.filterLfoDepth = this.lerp(0.6, 0.2, relaxation);

        // --- テクスチャ設定 ---
        audio.pinkNoiseMix = this.lerp(0.08, 0.3, stressLevel);
        audio.textureFilterCutoff = this.lerp(2500, 1000, relaxation);

        // --- エフェクト設定 ---
        audio.reverbMix = this.lerp(25, 60, sleepiness);
        audio.masterLpfCutoff = this.lerp(4500, 1800, relaxation);
        audio.chorusMix = this.lerp(0.2, 0.5, relaxation);
        audio.chorusRate = this.lerp(0.3, 0.1, relaxation);

        // --- エンベロープ ---
        audio.attackDuration = this.lerp(5, 18, sleepiness);
        audio.releaseDuration = this.lerp(8, 15, sleepiness);

        // --- マスター ---
        audio.masterVolume = this.lerp(0.5, 0.25, sleepiness);

        // バイノーラルビート
        if (sleepiness > 0.6) {
            audio.binauralBeatFrequency = this.lerp(6, 2, sleepiness); // シータ→デルタ
        } else if (relaxation > 0.5) {
            audio.binauralBeatFrequency = this.lerp(12, 8, relaxation); // アルファ波
        } else {
            audio.binauralBeatFrequency = 0;
        }

        return audio;
    }

    /**
     * 実験用マッピング（MRT用のランダム化などに使用）
     */
    private experimentalMapping(input: InterventionParameters): AudioParameters {
        const audio = this.adaptiveMapping(input);
        // ここでランダム化や実験条件の適用を行う
        return audio;
    }

    /**
     * 線形補間
     */
    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * Math.max(0, Math.min(1, t));
    }

    /**
     * ストレス・眠気レベルに応じたソルフェジオ周波数を選択
     */
    private selectSolfeggioFrequency(stress: number, sleepiness: number): number {
        if (stress > 0.7) {
            return 396.0;  // 不安解放
        } else if (sleepiness > 0.7) {
            return 174.0;  // 安心感
        } else if (stress > 0.4) {
            return 417.0;  // 変化の促進
        } else {
            return 528.0;  // 修復
        }
    }

    /**
     * デバッグ用: 現在のマッピング結果を文字列で表示
     */
    debugDescription(input: InterventionParameters): string {
        const audio = this.map(input);
        return `
=== Intervention Input ===
Relaxation: ${estimateRelaxation(input).toFixed(2)}
Sleep Readiness: ${estimateSleepReadiness(input).toFixed(2)}
Stress: ${input.selfReportedStress}/10
HR: ${input.heartRate} bpm, HRV: ${input.hrvRmssd} ms

=== Audio Output ===
Drone Base: ${audio.droneBaseFrequency.toFixed(1)} Hz
Solfeggio: ${audio.solfeggioFrequency.toFixed(0)} Hz
Filter Cutoff: ${audio.droneFilterCutoff.toFixed(0)} Hz
LFO Rate: ${audio.filterLfoRate.toFixed(3)} Hz
Pink Noise: ${(audio.pinkNoiseMix * 100).toFixed(1)}%
Reverb: ${audio.reverbMix.toFixed(0)}%
Master LPF: ${audio.masterLpfCutoff.toFixed(0)} Hz
Volume: ${(audio.masterVolume * 100).toFixed(0)}%
Attack: ${audio.attackDuration.toFixed(1)} sec
Binaural: ${audio.binauralBeatFrequency.toFixed(1)} Hz
        `.trim();
    }
}
