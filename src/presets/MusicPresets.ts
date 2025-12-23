/**
 * Relaxation & Sleep Music Presets
 * 10 unique ambient soundscapes for JITAI sleep research
 */
import { ChannelManager } from '../channel/ChannelManager';
import { Channel } from '../channel/Channel';

export interface MusicPreset {
    id: string;
    name: string;
    description: string;
    bpm: number;
    length: 64 | 128;
    setup: (manager: ChannelManager) => Promise<void>;
}

// Utility: Create chord from root note and intervals
function chord(root: number, intervals: number[]): number[] {
    return [root, ...intervals.map(i => root + i)];
}

// Common scales
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
const PENTATONIC = [0, 2, 4, 7, 9];

// ============================================
// Preset 1: Moonlit Ocean
// ============================================
async function setupMoonlitOcean(manager: ChannelManager): Promise<void> {
    manager.setBpm(48);

    // Deep ocean bass
    const bass = await manager.createChannel('Ocean Floor');
    bass.getSynth().setParams({
        osc1Level: 1.0, osc1Detune: 0,
        osc2Level: 0.4, osc2Semitone: 12, osc2Detune: 3,
        osc3Level: 0,
        filterCutoff: 120, filterRes: 0,
        ampAttack: 3, ampDecay: 2, ampSustain: 1, ampRelease: 4,
        longReverbEnabled: true, longReverbDecay: 10, longReverbDryWet: 0.3
    });
    bass.volume = 0.7;
    const bassSq = bass.getSequencer();
    bassSq.clearAll();
    // Eb1 - Ab1 - Bb1 - Eb1
    bassSq.addNote(0, 27, 70, 28);   // Eb1
    bassSq.addNote(32, 32, 65, 28);  // Ab1
    bassSq.addNote(64, 34, 65, 28);  // Bb1
    bassSq.addNote(96, 27, 70, 28);  // Eb1

    // Gentle pad waves
    const pad = await manager.createChannel('Wave Pad');
    pad.getSynth().setParams({
        osc1Level: 0.6, osc1Detune: -8,
        osc2Level: 0.6, osc2Detune: 8,
        osc3Level: 0.4, osc3Semitone: 12,
        filterCutoff: 600, filterRes: 0.1,
        ampAttack: 5, ampDecay: 3, ampSustain: 0.6, ampRelease: 6,
        chorusMix: 0.4, chorusRate: 0.1,
        longReverbEnabled: true, longReverbDecay: 12, longReverbDryWet: 0.5
    });
    pad.volume = 0.5;
    pad.pan = -0.2;
    const padSq = pad.getSequencer();
    padSq.clearAll();
    // Ebmaj7 - Abmaj7 - Bbsus4 - Eb
    chord(51, [4, 7, 11]).forEach((n, i) => padSq.addNote(i * 3, n, 55, 26));
    chord(56, [4, 7, 11]).forEach((n, i) => padSq.addNote(32 + i * 3, n, 50, 26));
    chord(58, [5, 7, 12]).forEach((n, i) => padSq.addNote(64 + i * 3, n, 50, 26));
    chord(51, [7, 12]).forEach((n, i) => padSq.addNote(96 + i * 3, n, 50, 26));

    // Shimmering bells
    const bells = await manager.createChannel('Moon Bells');
    bells.getSynth().setParams({
        osc1Level: 0.5, osc1Wave: 'sine',
        osc2Level: 0.3, osc2Semitone: 19,
        osc3Level: 0.2, osc3Semitone: 24,
        filterCutoff: 2000, filterRes: 0.15,
        ampAttack: 0.5, ampDecay: 3, ampSustain: 0, ampRelease: 5,
        longReverbEnabled: true, longReverbDecay: 15, longReverbDryWet: 0.7
    });
    bells.volume = 0.3;
    bells.pan = 0.3;
    const bellsSq = bells.getSequencer();
    bellsSq.clearAll();
    [8, 24, 44, 56, 72, 88, 104, 118].forEach(step => {
        bellsSq.addNote(step, 75 + Math.floor(Math.random() * 12), 40, 4);
    });

    manager.setLength(128);
}

// ============================================
// Preset 2: Forest Lullaby
// ============================================
async function setupForestLullaby(manager: ChannelManager): Promise<void> {
    manager.setBpm(56);

    // Warm bass
    const bass = await manager.createChannel('Forest Floor');
    bass.getSynth().setParams({
        osc1Level: 1, osc2Level: 0.3, osc2Semitone: 12,
        filterCutoff: 200, ampAttack: 2, ampRelease: 3,
        longReverbDecay: 8, longReverbDryWet: 0.2
    });
    bass.volume = 0.65;
    const bassSq = bass.getSequencer();
    bassSq.clearAll();
    // Am - F - C - G progression in A minor
    [33, 29, 36, 31].forEach((note, i) => bassSq.addNote(i * 32, note, 65, 28));

    // Leaf rustling pad
    const pad = await manager.createChannel('Canopy');
    pad.getSynth().setParams({
        osc1Level: 0.5, osc1Detune: -6,
        osc2Level: 0.5, osc2Detune: 6,
        osc3Level: 0.3, osc3Semitone: 7,
        filterCutoff: 800, filterRes: 0.08,
        ampAttack: 4, ampSustain: 0.5, ampRelease: 5,
        chorusMix: 0.35, longReverbDecay: 10, longReverbDryWet: 0.4
    });
    pad.volume = 0.45;
    const padSq = pad.getSequencer();
    padSq.clearAll();
    // Am9 - Fmaj7 - Cmaj7 - G6
    [[57, 60, 64, 67, 71], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]].forEach((ch, i) => {
        ch.forEach((n, j) => padSq.addNote(i * 32 + j * 2, n, 50, 26));
    });

    // Bird-like melody
    const melody = await manager.createChannel('Songbird');
    melody.getSynth().setParams({
        osc1Level: 0.6, filterCutoff: 1500,
        ampAttack: 0.3, ampDecay: 1.5, ampSustain: 0, ampRelease: 3,
        longReverbDecay: 12, longReverbDryWet: 0.6
    });
    melody.volume = 0.25;
    melody.pan = 0.25;
    const melSq = melody.getSequencer();
    melSq.clearAll();
    // Simple pentatonic melody
    [[4, 76], [12, 72], [20, 74], [40, 79], [52, 76], [68, 72], [84, 74], [100, 71]].forEach(([step, note]) => {
        melSq.addNote(step, note, 45, 6);
    });

    manager.setLength(128);
}

// ============================================
// Preset 3: Starfield Dreams
// ============================================
async function setupStarfieldDreams(manager: ChannelManager): Promise<void> {
    manager.setBpm(40);

    // Deep space drone
    const drone = await manager.createChannel('Deep Space');
    drone.getSynth().setParams({
        osc1Level: 1, osc2Level: 0.5, osc2Semitone: 7, osc2Detune: 2,
        osc3Level: 0.3, osc3Semitone: 12,
        filterCutoff: 300, ampAttack: 6, ampSustain: 1, ampRelease: 8,
        longReverbDecay: 15, longReverbDryWet: 0.4
    });
    drone.volume = 0.6;
    const droneSq = drone.getSequencer();
    droneSq.clearAll();
    droneSq.addNote(0, 31, 60, 60);  // G1
    droneSq.addNote(64, 36, 55, 60); // C2

    // Cosmic shimmer
    const shimmer = await manager.createChannel('Starlight');
    shimmer.getSynth().setParams({
        osc1Level: 0.4, osc2Level: 0.4, osc2Semitone: 12, osc2Detune: 5,
        osc3Level: 0.3, osc3Semitone: 19,
        filterCutoff: 1200, filterRes: 0.2,
        lfo1Rate: 0.05, lfo1Amount: 0.3, lfo1Target: 'filter',
        ampAttack: 4, ampSustain: 0.4, ampRelease: 6,
        chorusMix: 0.5, longReverbDecay: 18, longReverbDryWet: 0.6
    });
    shimmer.volume = 0.4;
    shimmer.pan = 0.15;
    const shimmerSq = shimmer.getSequencer();
    shimmerSq.clearAll();
    // Ethereal G major 9 voicings
    [[55, 59, 62, 66, 69], [48, 52, 55, 59, 64]].forEach((ch, i) => {
        ch.forEach((n, j) => shimmerSq.addNote(i * 64 + j * 4, n, 45, 50));
    });

    // Twinkling stars
    const stars = await manager.createChannel('Stars');
    stars.getSynth().setParams({
        osc1Level: 0.5, filterCutoff: 3000,
        ampAttack: 0.1, ampDecay: 2, ampSustain: 0, ampRelease: 4,
        longReverbDecay: 20, longReverbDryWet: 0.8
    });
    stars.volume = 0.2;
    const starsSq = stars.getSequencer();
    starsSq.clearAll();
    [6, 18, 30, 42, 54, 70, 86, 98, 110, 122].forEach(step => {
        starsSq.addNote(step, 79 + Math.floor(Math.random() * 12), 35, 3);
    });

    manager.setLength(128);
}

// ============================================
// Preset 4: Rainfall Meditation
// ============================================
async function setupRainfallMeditation(manager: ChannelManager): Promise<void> {
    manager.setBpm(52);

    // Rain texture (noise-based)
    const rain = await manager.createChannel('Rain');
    rain.getSynth().setParams({
        osc1Level: 0.1, noiseType: 'pink', noiseLevel: 0.15,
        filterCutoff: 2500, filterRes: 0,
        ampAttack: 2, ampSustain: 0.8, ampRelease: 3,
        longReverbDecay: 6, longReverbDryWet: 0.3
    });
    rain.volume = 0.5;
    const rainSq = rain.getSequencer();
    rainSq.clearAll();
    rainSq.addNote(0, 60, 30, 120);

    // Warm indoor pad
    const pad = await manager.createChannel('Warm Room');
    pad.getSynth().setParams({
        osc1Level: 0.6, osc1Detune: -5,
        osc2Level: 0.6, osc2Detune: 5,
        osc3Level: 0.4, osc3Semitone: 12,
        filterCutoff: 500, filterRes: 0.08,
        ampAttack: 5, ampSustain: 0.6, ampRelease: 6,
        chorusMix: 0.3, longReverbDecay: 8, longReverbDryWet: 0.35
    });
    pad.volume = 0.5;
    const padSq = pad.getSequencer();
    padSq.clearAll();
    // Dmaj7 - Bm7 - Gmaj7 - A7sus4
    [[50, 54, 57, 61], [47, 50, 54, 57], [43, 47, 50, 54], [45, 50, 52, 55]].forEach((ch, i) => {
        ch.forEach((n, j) => padSq.addNote(i * 32 + j * 3, n, 50, 28));
    });

    // Gentle melody
    const melody = await manager.createChannel('Thoughts');
    melody.getSynth().setParams({
        osc1Level: 0.5, filterCutoff: 1200,
        ampAttack: 0.8, ampDecay: 2, ampSustain: 0.2, ampRelease: 4,
        longReverbDecay: 12, longReverbDryWet: 0.5
    });
    melody.volume = 0.3;
    melody.pan = -0.2;
    const melSq = melody.getSequencer();
    melSq.clearAll();
    [[8, 69], [24, 66], [48, 71], [72, 69], [88, 67], [104, 66]].forEach(([step, note]) => {
        melSq.addNote(step, note, 45, 10);
    });

    manager.setLength(128);
}

// ============================================
// Preset 5: Floating Clouds
// ============================================
async function setupFloatingClouds(manager: ChannelManager): Promise<void> {
    manager.setBpm(44);

    // Cloud layer 1
    const cloud1 = await manager.createChannel('High Clouds');
    cloud1.getSynth().setParams({
        osc1Level: 0.5, osc1Detune: -3,
        osc2Level: 0.5, osc2Detune: 3, osc2Semitone: 12,
        filterCutoff: 1000, lfo1Rate: 0.03, lfo1Amount: 0.2, lfo1Target: 'filter',
        ampAttack: 6, ampSustain: 0.7, ampRelease: 8,
        chorusMix: 0.5, longReverbDecay: 14, longReverbDryWet: 0.5
    });
    cloud1.volume = 0.45;
    cloud1.pan = -0.3;
    const c1Sq = cloud1.getSequencer();
    c1Sq.clearAll();
    // Bb major floating
    [[58, 62, 65], [60, 63, 67], [58, 62, 65, 70], [55, 58, 62]].forEach((ch, i) => {
        ch.forEach((n, j) => c1Sq.addNote(i * 32 + j * 4, n, 45, 28));
    });

    // Cloud layer 2
    const cloud2 = await manager.createChannel('Low Clouds');
    cloud2.getSynth().setParams({
        osc1Level: 0.6, osc2Level: 0.4, osc2Semitone: 7,
        filterCutoff: 400, ampAttack: 5, ampSustain: 0.8, ampRelease: 6,
        longReverbDecay: 10, longReverbDryWet: 0.4
    });
    cloud2.volume = 0.5;
    cloud2.pan = 0.2;
    const c2Sq = cloud2.getSequencer();
    c2Sq.clearAll();
    [34, 36, 34, 31].forEach((note, i) => c2Sq.addNote(i * 32, note, 55, 28));

    // Wind texture
    const wind = await manager.createChannel('Wind');
    wind.getSynth().setParams({
        osc1Level: 0.2, osc2Level: 0.2, osc2Detune: 20,
        noiseType: 'pink', noiseLevel: 0.05,
        filterCutoff: 1500, lfo1Rate: 0.08, lfo1Amount: 0.4,
        ampAttack: 8, ampSustain: 0.5, ampRelease: 8,
        longReverbDecay: 12, longReverbDryWet: 0.6
    });
    wind.volume = 0.25;
    const windSq = wind.getSequencer();
    windSq.clearAll();
    windSq.addNote(0, 70, 30, 60);
    windSq.addNote(64, 72, 25, 60);

    manager.setLength(128);
}

// ============================================
// Preset 6: Ancient Temple
// ============================================
async function setupAncientTemple(manager: ChannelManager): Promise<void> {
    manager.setBpm(36);

    // Temple drone
    const drone = await manager.createChannel('Temple Drone');
    drone.getSynth().setParams({
        osc1Level: 1, osc2Level: 0.6, osc2Semitone: 7,
        osc3Level: 0.4, osc3Semitone: 12,
        filterCutoff: 250, ampAttack: 4, ampSustain: 1, ampRelease: 6,
        longReverbDecay: 18, longReverbDryWet: 0.5
    });
    drone.volume = 0.6;
    const droneSq = drone.getSequencer();
    droneSq.clearAll();
    // D Phrygian drone
    droneSq.addNote(0, 26, 65, 60);  // D1
    droneSq.addNote(64, 26, 60, 60);

    // Singing bowls
    const bowls = await manager.createChannel('Singing Bowl');
    bowls.getSynth().setParams({
        osc1Level: 0.6, osc2Level: 0.4, osc2Semitone: 12, osc2Detune: 1,
        osc3Level: 0.3, osc3Semitone: 19,
        filterCutoff: 2500, filterRes: 0.1,
        ampAttack: 0.5, ampDecay: 8, ampSustain: 0.1, ampRelease: 10,
        longReverbDecay: 20, longReverbDryWet: 0.7
    });
    bowls.volume = 0.35;
    const bowlsSq = bowls.getSequencer();
    bowlsSq.clearAll();
    [[0, 62], [20, 65], [44, 69], [64, 62], [88, 67], [108, 65]].forEach(([step, note]) => {
        bowlsSq.addNote(step, note, 50, 12);
    });

    // Whispered chant
    const chant = await manager.createChannel('Chant');
    chant.getSynth().setParams({
        osc1Level: 0.4, osc2Level: 0.3, osc2Semitone: 12,
        filterCutoff: 800, filterRes: 0.15,
        ampAttack: 3, ampSustain: 0.5, ampRelease: 5,
        chorusMix: 0.4, longReverbDecay: 15, longReverbDryWet: 0.6
    });
    chant.volume = 0.3;
    chant.pan = 0.1;
    const chantSq = chant.getSequencer();
    chantSq.clearAll();
    // D phrygian modal melody
    [[50, 53, 55], [50, 52, 55]].forEach((ch, i) => {
        ch.forEach((n, j) => chantSq.addNote(i * 64 + 8 + j * 8, n, 40, 20));
    });

    manager.setLength(128);
}

// ============================================
// Preset 7: Crystalline Waters
// ============================================
async function setupCrystallineWaters(manager: ChannelManager): Promise<void> {
    manager.setBpm(54);

    // Water flow bass
    const water = await manager.createChannel('Water Flow');
    water.getSynth().setParams({
        osc1Level: 0.8, osc2Level: 0.4, osc2Semitone: 12, osc2Detune: 2,
        filterCutoff: 300, lfo1Rate: 0.1, lfo1Amount: 0.15, lfo1Target: 'filter',
        ampAttack: 3, ampSustain: 0.8, ampRelease: 4,
        longReverbDecay: 10, longReverbDryWet: 0.35
    });
    water.volume = 0.55;
    const waterSq = water.getSequencer();
    waterSq.clearAll();
    // E minor progression
    [28, 33, 31, 28].forEach((note, i) => waterSq.addNote(i * 32, note, 60, 28));

    // Crystal shimmer
    const crystal = await manager.createChannel('Crystals');
    crystal.getSynth().setParams({
        osc1Level: 0.5, osc2Level: 0.5, osc2Semitone: 12,
        osc3Level: 0.3, osc3Semitone: 24,
        filterCutoff: 3000, filterRes: 0.2,
        ampAttack: 0.2, ampDecay: 3, ampSustain: 0.1, ampRelease: 5,
        longReverbDecay: 16, longReverbDryWet: 0.7
    });
    crystal.volume = 0.25;
    crystal.pan = 0.25;
    const crystalSq = crystal.getSequencer();
    crystalSq.clearAll();
    [4, 12, 28, 36, 52, 68, 76, 92, 108, 116].forEach(step => {
        crystalSq.addNote(step, 76 + Math.floor(Math.random() * 12), 40, 4);
    });

    // Flowing pad
    const pad = await manager.createChannel('Mist');
    pad.getSynth().setParams({
        osc1Level: 0.5, osc1Detune: -6,
        osc2Level: 0.5, osc2Detune: 6,
        filterCutoff: 700, ampAttack: 5, ampSustain: 0.6, ampRelease: 6,
        chorusMix: 0.45, longReverbDecay: 12, longReverbDryWet: 0.5
    });
    pad.volume = 0.4;
    pad.pan = -0.2;
    const padSq = pad.getSequencer();
    padSq.clearAll();
    // Em9 - Cmaj7 - Am7 - Bm7
    [[52, 55, 59, 62, 66], [48, 52, 55, 59], [45, 48, 52, 55], [47, 50, 54, 57]].forEach((ch, i) => {
        ch.forEach((n, j) => padSq.addNote(i * 32 + j * 2, n, 45, 26));
    });

    manager.setLength(128);
}

// ============================================
// Preset 8: Velvet Night
// ============================================
async function setupVelvetNight(manager: ChannelManager): Promise<void> {
    manager.setBpm(46);

    // Deep velvet bass
    const bass = await manager.createChannel('Velvet Bass');
    bass.getSynth().setParams({
        osc1Level: 1, osc2Level: 0.3, osc2Semitone: 12,
        filterCutoff: 180, ampAttack: 3, ampSustain: 0.9, ampRelease: 4,
        longReverbDecay: 8, longReverbDryWet: 0.25
    });
    bass.volume = 0.65;
    const bassSq = bass.getSequencer();
    bassSq.clearAll();
    // Db major warmth
    [25, 30, 32, 25].forEach((note, i) => bassSq.addNote(i * 32, note, 60, 28));

    // Soft strings
    const strings = await manager.createChannel('Soft Strings');
    strings.getSynth().setParams({
        osc1Level: 0.5, osc1Detune: -4,
        osc2Level: 0.5, osc2Detune: 4,
        osc3Level: 0.3, osc3Semitone: 12, osc3Detune: 2,
        filterCutoff: 600, filterRes: 0.05,
        ampAttack: 6, ampSustain: 0.7, ampRelease: 7,
        chorusMix: 0.35, longReverbDecay: 14, longReverbDryWet: 0.45
    });
    strings.volume = 0.45;
    const strSq = strings.getSequencer();
    strSq.clearAll();
    // Dbmaj7 - Bbm7 - Gbmaj7 - Ab
    [[49, 53, 56, 60], [46, 49, 53, 56], [42, 46, 49, 53], [44, 48, 51, 56]].forEach((ch, i) => {
        ch.forEach((n, j) => strSq.addNote(i * 32 + j * 3, n, 48, 26));
    });

    // Night whispers
    const whisper = await manager.createChannel('Night Air');
    whisper.getSynth().setParams({
        osc1Level: 0.3, osc2Level: 0.2, osc2Semitone: 7,
        noiseType: 'pink', noiseLevel: 0.03,
        filterCutoff: 1200, lfo1Rate: 0.05, lfo1Amount: 0.25,
        ampAttack: 5, ampSustain: 0.4, ampRelease: 6,
        longReverbDecay: 16, longReverbDryWet: 0.6
    });
    whisper.volume = 0.25;
    whisper.pan = 0.15;
    const whSq = whisper.getSequencer();
    whSq.clearAll();
    whSq.addNote(0, 68, 30, 55);
    whSq.addNote(64, 70, 25, 55);

    manager.setLength(128);
}

// ============================================
// Preset 9: Sacred Garden
// ============================================
async function setupSacredGarden(manager: ChannelManager): Promise<void> {
    manager.setBpm(50);

    // Earth bass
    const earth = await manager.createChannel('Garden Earth');
    earth.getSynth().setParams({
        osc1Level: 1, osc2Level: 0.5, osc2Semitone: 12,
        filterCutoff: 200, ampAttack: 2.5, ampSustain: 0.9, ampRelease: 3.5,
        longReverbDecay: 8, longReverbDryWet: 0.2
    });
    earth.volume = 0.6;
    const earthSq = earth.getSequencer();
    earthSq.clearAll();
    // A major - gentle
    [33, 35, 33, 28].forEach((note, i) => earthSq.addNote(i * 32, note, 55, 28));

    // Flower pad
    const flowers = await manager.createChannel('Blossoms');
    flowers.getSynth().setParams({
        osc1Level: 0.55, osc1Detune: -5,
        osc2Level: 0.55, osc2Detune: 5,
        osc3Level: 0.35, osc3Semitone: 12,
        filterCutoff: 900, filterRes: 0.08,
        ampAttack: 4, ampSustain: 0.6, ampRelease: 5,
        chorusMix: 0.4, longReverbDecay: 11, longReverbDryWet: 0.45
    });
    flowers.volume = 0.45;
    flowers.pan = -0.15;
    const flSq = flowers.getSequencer();
    flSq.clearAll();
    // Amaj7 - F#m7 - Dmaj7 - E
    [[57, 61, 64, 68], [54, 57, 61, 64], [50, 54, 57, 61], [52, 56, 59, 64]].forEach((ch, i) => {
        ch.forEach((n, j) => flSq.addNote(i * 32 + j * 2, n, 48, 26));
    });

    // Butterfly melody
    const butterfly = await manager.createChannel('Butterfly');
    butterfly.getSynth().setParams({
        osc1Level: 0.5, filterCutoff: 1800,
        ampAttack: 0.4, ampDecay: 2, ampSustain: 0.1, ampRelease: 4,
        longReverbDecay: 14, longReverbDryWet: 0.6
    });
    butterfly.volume = 0.28;
    butterfly.pan = 0.2;
    const bfSq = butterfly.getSequencer();
    bfSq.clearAll();
    [[6, 73], [14, 76], [38, 78], [46, 76], [70, 80], [78, 78], [102, 76], [118, 73]].forEach(([step, note]) => {
        bfSq.addNote(step, note, 42, 6);
    });

    manager.setLength(128);
}

// ============================================
// Preset 10: Eternal Horizon
// ============================================
async function setupEternalHorizon(manager: ChannelManager): Promise<void> {
    manager.setBpm(38);

    // Horizon drone
    const horizon = await manager.createChannel('Horizon');
    horizon.getSynth().setParams({
        osc1Level: 0.8, osc2Level: 0.5, osc2Semitone: 7, osc2Detune: 1,
        osc3Level: 0.4, osc3Semitone: 12,
        filterCutoff: 350, ampAttack: 8, ampSustain: 1, ampRelease: 10,
        longReverbDecay: 20, longReverbDryWet: 0.5
    });
    horizon.volume = 0.55;
    const hSq = horizon.getSequencer();
    hSq.clearAll();
    hSq.addNote(0, 29, 55, 60);   // F1
    hSq.addNote(64, 31, 50, 60);  // G1

    // Sunset colors
    const sunset = await manager.createChannel('Sunset Glow');
    sunset.getSynth().setParams({
        osc1Level: 0.5, osc1Detune: -7,
        osc2Level: 0.5, osc2Detune: 7,
        osc3Level: 0.4, osc3Semitone: 12, osc3Detune: 3,
        filterCutoff: 800, filterRes: 0.1,
        lfo1Rate: 0.04, lfo1Amount: 0.2, lfo1Target: 'filter',
        ampAttack: 6, ampSustain: 0.6, ampRelease: 8,
        chorusMix: 0.5, longReverbDecay: 16, longReverbDryWet: 0.55
    });
    sunset.volume = 0.4;
    sunset.pan = -0.2;
    const sSq = sunset.getSequencer();
    sSq.clearAll();
    // Fmaj9 - Dm9
    [[53, 57, 60, 64, 67], [50, 53, 57, 60, 64]].forEach((ch, i) => {
        ch.forEach((n, j) => sSq.addNote(i * 64 + j * 4, n, 45, 55));
    });

    // Distant light
    const light = await manager.createChannel('Light Rays');
    light.getSynth().setParams({
        osc1Level: 0.4, osc2Level: 0.3, osc2Semitone: 19,
        filterCutoff: 2000, ampAttack: 1, ampDecay: 4, ampSustain: 0.1, ampRelease: 6,
        longReverbDecay: 22, longReverbDryWet: 0.75
    });
    light.volume = 0.2;
    light.pan = 0.3;
    const lSq = light.getSequencer();
    lSq.clearAll();
    [10, 30, 50, 74, 94, 114].forEach(step => {
        lSq.addNote(step, 77 + Math.floor(Math.random() * 8), 35, 5);
    });

    manager.setLength(128);
}

// ============================================
// Export all presets
// ============================================
export const MUSIC_PRESETS: MusicPreset[] = [
    {
        id: 'moonlit-ocean',
        name: 'Moonlit Ocean',
        description: 'Gentle waves under starlight - Eb major ethereal',
        bpm: 48,
        length: 128,
        setup: setupMoonlitOcean
    },
    {
        id: 'forest-lullaby',
        name: 'Forest Lullaby',
        description: 'Peaceful woodland at dusk - A minor pentatonic',
        bpm: 56,
        length: 128,
        setup: setupForestLullaby
    },
    {
        id: 'starfield-dreams',
        name: 'Starfield Dreams',
        description: 'Floating through infinite space - G major cosmic',
        bpm: 40,
        length: 128,
        setup: setupStarfieldDreams
    },
    {
        id: 'rainfall-meditation',
        name: 'Rainfall Meditation',
        description: 'Warm room with rain outside - D major warm',
        bpm: 52,
        length: 128,
        setup: setupRainfallMeditation
    },
    {
        id: 'floating-clouds',
        name: 'Floating Clouds',
        description: 'Drifting through soft clouds - Bb major airy',
        bpm: 44,
        length: 128,
        setup: setupFloatingClouds
    },
    {
        id: 'ancient-temple',
        name: 'Ancient Temple',
        description: 'Sacred space and singing bowls - D phrygian modal',
        bpm: 36,
        length: 128,
        setup: setupAncientTemple
    },
    {
        id: 'crystalline-waters',
        name: 'Crystalline Waters',
        description: 'Crystal clear mountain stream - E minor flowing',
        bpm: 54,
        length: 128,
        setup: setupCrystallineWaters
    },
    {
        id: 'velvet-night',
        name: 'Velvet Night',
        description: 'Deep midnight serenity - Db major luxurious',
        bpm: 46,
        length: 128,
        setup: setupVelvetNight
    },
    {
        id: 'sacred-garden',
        name: 'Sacred Garden',
        description: 'Peaceful garden sanctuary - A major gentle',
        bpm: 50,
        length: 128,
        setup: setupSacredGarden
    },
    {
        id: 'eternal-horizon',
        name: 'Eternal Horizon',
        description: 'Endless sunset vista - F lydian expansive',
        bpm: 38,
        length: 128,
        setup: setupEternalHorizon
    }
];

/**
 * Load a music preset by ID
 */
export async function loadMusicPreset(manager: ChannelManager, presetId: string): Promise<boolean> {
    const preset = MUSIC_PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    // Stop and clear
    manager.stop();
    const channels = manager.getAllChannels();
    for (const ch of channels) {
        manager.removeChannel(ch.id);
    }

    // Setup new preset
    await preset.setup(manager);

    console.log(`Loaded music preset: ${preset.name}`);
    return true;
}
