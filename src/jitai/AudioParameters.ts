/**
 * 音響生成のためのパラメータ
 * シンセサイザーへの入力値を統合管理
 */
export interface AudioParameters {
    // ドローン音響パラメータ
    droneBaseFrequency: number;    // 基底周波数 (Hz) - 30-80
    solfeggioFrequency: number;    // ソルフェジオ周波数 (Hz)
    solfeggioMix: number;          // ソルフェジオミックス量 (0-1)
    droneFilterCutoff: number;     // フィルターカットオフ (Hz)
    filterLfoRate: number;         // フィルターLFO速度 (Hz)
    filterLfoDepth: number;        // フィルターLFO深さ (0-1)

    // テクスチャパラメータ
    pinkNoiseMix: number;          // ピンクノイズミックス量 (0-1)
    textureFilterCutoff: number;   // テクスチャフィルターカットオフ (Hz)

    // エンベロープ
    attackDuration: number;        // アタック時間 (秒)
    releaseDuration: number;       // リリース時間 (秒)

    // エフェクト
    reverbMix: number;             // リバーブミックス (0-100%)
    masterLpfCutoff: number;       // マスターLPFカットオフ (Hz)
    chorusMix: number;             // コーラスミックス (0-1)
    chorusRate: number;            // コーラス速度 (Hz)

    // マスター
    masterVolume: number;          // マスターボリューム (0-1)

    // バイノーラルビート
    binauralBeatFrequency: number; // バイノーラルビート周波数差 (Hz)
}

/**
 * デフォルト値
 */
export const DEFAULT_AUDIO_PARAMS: AudioParameters = {
    droneBaseFrequency: 45.0,
    solfeggioFrequency: 528.0,
    solfeggioMix: 0.3,
    droneFilterCutoff: 1000.0,
    filterLfoRate: 0.03,
    filterLfoDepth: 0.5,
    pinkNoiseMix: 0.2,
    textureFilterCutoff: 2000.0,
    attackDuration: 8.0,
    releaseDuration: 10.0,
    reverbMix: 30.0,
    masterLpfCutoff: 4000.0,
    chorusMix: 0.3,
    chorusRate: 0.2,
    masterVolume: 0.4,
    binauralBeatFrequency: 0.0
};

/**
 * 深いリラクゼーション向けプリセット
 */
export const DEEP_RELAXATION_PRESET: AudioParameters = {
    droneBaseFrequency: 36.0,
    solfeggioFrequency: 528.0,
    solfeggioMix: 0.4,
    droneFilterCutoff: 600.0,
    filterLfoRate: 0.02,
    filterLfoDepth: 0.3,
    pinkNoiseMix: 0.15,
    textureFilterCutoff: 1500.0,
    attackDuration: 12.0,
    releaseDuration: 15.0,
    reverbMix: 50.0,
    masterLpfCutoff: 2500.0,
    chorusMix: 0.4,
    chorusRate: 0.15,
    masterVolume: 0.35,
    binauralBeatFrequency: 6.0  // シータ波
};

/**
 * 睡眠誘導向けプリセット
 */
export const SLEEP_INDUCTION_PRESET: AudioParameters = {
    droneBaseFrequency: 30.0,
    solfeggioFrequency: 396.0,  // 不安解放
    solfeggioMix: 0.25,
    droneFilterCutoff: 400.0,
    filterLfoRate: 0.015,
    filterLfoDepth: 0.2,
    pinkNoiseMix: 0.25,
    textureFilterCutoff: 1200.0,
    attackDuration: 15.0,
    releaseDuration: 20.0,
    reverbMix: 60.0,
    masterLpfCutoff: 1800.0,
    chorusMix: 0.5,
    chorusRate: 0.1,
    masterVolume: 0.3,
    binauralBeatFrequency: 3.0  // デルタ波
};

/**
 * 軽いリラクゼーション向けプリセット
 */
export const LIGHT_RELAXATION_PRESET: AudioParameters = {
    droneBaseFrequency: 55.0,
    solfeggioFrequency: 639.0,  // 調和
    solfeggioMix: 0.35,
    droneFilterCutoff: 1200.0,
    filterLfoRate: 0.04,
    filterLfoDepth: 0.5,
    pinkNoiseMix: 0.1,
    textureFilterCutoff: 2500.0,
    attackDuration: 6.0,
    releaseDuration: 8.0,
    reverbMix: 35.0,
    masterLpfCutoff: 3500.0,
    chorusMix: 0.3,
    chorusRate: 0.25,
    masterVolume: 0.45,
    binauralBeatFrequency: 10.0  // アルファ波
};
