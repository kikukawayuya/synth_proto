/**
 * 研究用インプットパラメータ: 環境データ、生理データ、行動データ
 * Just-in-Time Adaptive Intervention (JITAI) のための状態変数を管理
 */
export interface InterventionParameters {
    // 環境データ (Environmental)
    roomTemperature: number;      // 室温 (℃) - 典型値: 18-28
    humidity: number;             // 湿度 (%) - 典型値: 30-70
    minutesToSunset: number;      // 日没までの時間 (分) - 負の値は日没後
    minutesToBedtime: number;     // 就寝予定時刻までの時間 (分)

    // 生理データ (Physiological)
    heartRate: number;            // 心拍数 (bpm) - 安静時: 60-80
    hrvRmssd: number;             // HRV RMSSD (ms) - 高いほどリラックス: 20-80
    hrvLfHfRatio: number;         // LF/HF比 - 低いほど副交感優位: 0.5-3.0

    // 行動データ (Behavioral)
    previousSleepHours: number;   // 前夜の睡眠時間 (時間)
    previousSleepEfficiency: number; // 前夜の睡眠効率 (%)
    stepsToday: number;           // 今日の歩数
    hoursSinceExercise: number;   // 運動後経過時間 (時間)
    hoursSinceCaffeine: number;   // カフェイン摂取後経過時間 (時間)

    // ユーザー状態 (User State)
    selfReportedStress: number;   // ストレスレベル (0-10)
    selfReportedSleepiness: number; // 眠気レベル (0-10)
}

/**
 * デフォルト値
 */
export const DEFAULT_INTERVENTION_PARAMS: InterventionParameters = {
    roomTemperature: 22.0,
    humidity: 50.0,
    minutesToSunset: -60.0,
    minutesToBedtime: 30.0,
    heartRate: 70.0,
    hrvRmssd: 40.0,
    hrvLfHfRatio: 1.5,
    previousSleepHours: 7.0,
    previousSleepEfficiency: 85.0,
    stepsToday: 8000,
    hoursSinceExercise: 4.0,
    hoursSinceCaffeine: 8.0,
    selfReportedStress: 5.0,
    selfReportedSleepiness: 4.0
};

/**
 * プリセット: 高ストレス状態
 */
export const HIGH_STRESS_PRESET: InterventionParameters = {
    ...DEFAULT_INTERVENTION_PARAMS,
    heartRate: 85,
    hrvRmssd: 25,
    hrvLfHfRatio: 2.5,
    selfReportedStress: 8,
    selfReportedSleepiness: 3
};

/**
 * プリセット: リラックス状態
 */
export const RELAXED_PRESET: InterventionParameters = {
    ...DEFAULT_INTERVENTION_PARAMS,
    heartRate: 58,
    hrvRmssd: 65,
    hrvLfHfRatio: 0.8,
    selfReportedStress: 2,
    selfReportedSleepiness: 6
};

/**
 * プリセット: 睡眠直前
 */
export const PRE_SLEEP_PRESET: InterventionParameters = {
    ...DEFAULT_INTERVENTION_PARAMS,
    minutesToBedtime: 5,
    heartRate: 55,
    hrvRmssd: 70,
    hrvLfHfRatio: 0.6,
    selfReportedStress: 1,
    selfReportedSleepiness: 8
};

/**
 * リラックス度を推定 (0-1)
 */
export function estimateRelaxation(params: InterventionParameters): number {
    const hrvScore = Math.min(1.0, params.hrvRmssd / 60.0);
    const hrScore = Math.max(0, Math.min(1.0, (80 - params.heartRate) / 30.0));
    const stressScore = (10 - params.selfReportedStress) / 10.0;
    return hrvScore * 0.4 + hrScore * 0.3 + stressScore * 0.3;
}

/**
 * 睡眠準備度を推定 (0-1)
 */
export function estimateSleepReadiness(params: InterventionParameters): number {
    const timeScore = params.minutesToBedtime < 60
        ? 1.0
        : Math.max(0, 1.0 - (params.minutesToBedtime - 60) / 120.0);
    const sleepDebt = params.previousSleepHours < 7
        ? (7 - params.previousSleepHours) / 3.0
        : 0;
    const sleepinessScore = params.selfReportedSleepiness / 10.0;
    return Math.min(1.0, timeScore * 0.3 + sleepDebt * 0.2 + sleepinessScore * 0.5);
}
