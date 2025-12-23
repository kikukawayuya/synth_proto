/**
 * Sleepy Drone Ambient Generator
 * Creates a soothing, multi-layered drone soundscape optimized for sleep.
 */
import { ChannelManager } from '../channel/ChannelManager';
import { Channel } from '../channel/Channel';

export async function generateDroneProject(manager: ChannelManager): Promise<void> {
    console.log('Generating Sleepy Drone Ambient Project...');

    // Stop audio
    manager.stop();

    // Clear existing channels
    const channels = manager.getAllChannels();
    for (const ch of channels) {
        manager.removeChannel(ch.id);
    }

    // Set BPM low for slow movement
    manager.setBpm(36); // Even slower for deep relaxation

    // --- Channel 1: Deep Sub Bass ---
    const subChannel = await manager.createChannel('Deep Sub');
    setupSubSynth(subChannel);
    setupSubPattern(subChannel);
    subChannel.volume = 0.8;
    subChannel.pan = 0;

    // --- Channel 2: Warm Pad ---
    const padChannel = await manager.createChannel('Warm Pad');
    setupPadSynth(padChannel);
    setupPadPattern(padChannel);
    padChannel.volume = 0.5; // Slightly reduced volume
    padChannel.pan = -0.3;

    // --- Channel 3: Ethereal Textures ---
    const textureChannel = await manager.createChannel('Textures');
    setupTextureSynth(textureChannel);
    setupTexturePattern(textureChannel);
    textureChannel.volume = 0.5;
    textureChannel.pan = 0.3;

    // --- Channel 4: Atmosphere ---
    const windChannel = await manager.createChannel('Atmosphere');
    setupWindSynth(windChannel);
    setupWindPattern(windChannel);
    windChannel.volume = 0.35;
    windChannel.pan = 0;

    // Apply length to all created channels
    manager.setLength(128);

    console.log('Drone project generated successfully!');
}

function setupSubSynth(channel: Channel) {
    const synth = channel.getSynth();
    synth.setParams({
        // Pure Sines
        osc1Level: 1.0, osc1Detune: 0,
        osc2Level: 0.5, osc2Semitone: 12, osc2Detune: 2,
        osc3Level: 0.0,

        // Low Lowpass
        filterCutoff: 150,
        filterRes: 0.0,
        filterEnvAmount: 0.05,

        // Slow Envelope
        ampAttack: 2.0,
        ampDecay: 1.0,
        ampSustain: 1.0,
        ampRelease: 3.0,

        reverbMix: 0.1,
    });
}

function setupPadSynth(channel: Channel) {
    const synth = channel.getSynth();
    synth.setParams({
        // Detuned Saws/Triangles
        osc1Level: 0.6, osc1Detune: -10,
        osc2Level: 0.6, osc2Semitone: 0, osc2Detune: 10,
        osc3Level: 0.4, osc3Detune: 5,

        // Warm Filter - Reduced resonance
        filterCutoff: 500,
        filterRes: 0.1, // Reduced to prevent resonant buildup
        filterEnvAmount: 0.2,
        filterAttack: 4.0,
        filterDecay: 6.0,
        filterSustain: 0.4,

        // Envelope - Reduced release to prevent infinite buildup
        ampAttack: 4.0,
        ampDecay: 4.0,
        ampSustain: 0.7,
        ampRelease: 3.0, // Shortened from 6.0

        // Effects - Tamed reverb tails
        reverbMix: 0.5,
        reverbDecay: 3.0, // Shortened from 5.0
        chorusMix: 0.4,
        chorusRate: 0.15,
        longReverbEnabled: true,
        longReverbDecay: 5.0, // Shortened from 8.0
        longReverbMix: 0.3  // Reduced from 0.4
    });
}

function setupTextureSynth(channel: Channel) {
    const synth = channel.getSynth();
    synth.setParams({
        osc1Level: 0.5, osc1Detune: 0,
        osc2Level: 0.5, osc2Semitone: 19,
        osc3Level: 0.3, osc3Detune: 12,

        filterCutoff: 1000,
        filterRes: 0.3,
        lfo1Rate: 0.08,
        lfo1Amount: 0.4,

        ampAttack: 5.0,
        ampDecay: 3.0,
        ampSustain: 0.5,
        ampRelease: 5.0,

        reverbMix: 0.7,
        reverbDecay: 6.0,
        longReverbEnabled: true,
        longReverbDecay: 8.0,
        longReverbMix: 0.5
    });
}

function setupWindSynth(channel: Channel) {
    const synth = channel.getSynth();
    // Re-designed for "Beautiful/Calm" sound
    // Using high sine waves with gentle modulation instead of noisy detune
    synth.setParams({
        osc1Level: 0.4, osc1Detune: 0,
        osc2Level: 0.3, osc2Semitone: 7, osc2Detune: 2, // Perfect 5th for stability
        osc3Level: 0.3, osc3Semitone: 12, osc3Detune: -2, // Octave up

        // Higher cutoff for "Air", but soft
        filterCutoff: 1800,
        filterRes: 0.0, // No resonance
        filterEnvAmount: 0.1,

        // Very slow, gentle envelope
        ampAttack: 8.0,
        ampDecay: 6.0,
        ampSustain: 0.6,
        ampRelease: 8.0,

        // Lots of space
        reverbMix: 0.6,
        chorusMix: 0.6, // Heavy chorus for "movement"
        chorusRate: 0.1,

        // Sine waves for purity
        lfo1Rate: 0.2, // Gentle panning/filter movement
        lfo1Amount: 0.2
    });
}

function setupSubPattern(channel: Channel) {
    const seq = channel.getSequencer();
    seq.clearAll();
    // 128 steps - 4 distinct sections of 32
    // Section 1: C2
    seq.addNote(0, 36, 90, 24);

    // Section 2: A1
    seq.addNote(32, 33, 85, 24);

    // Section 3: F1 (Lower)
    seq.addNote(64, 29, 85, 24);

    // Section 4: G1 -> C2 resolution
    seq.addNote(96, 31, 85, 16);
    seq.addNote(112, 36, 80, 16);
}

function setupPadPattern(channel: Channel) {
    const seq = channel.getSequencer();
    seq.clearAll();
    // Extended chord progression over 128 steps

    // 0-32: Cmaj9 (Add stability)
    seq.addNote(0, 60, 65, 20); // C4
    seq.addNote(0, 64, 60, 20); // E4
    seq.addNote(4, 67, 60, 20); // G4
    seq.addNote(8, 71, 55, 20); // B4
    seq.addNote(12, 74, 50, 20); // D5

    // 32-64: Am11 (Deep emotion)
    seq.addNote(32, 57, 65, 20); // A3
    seq.addNote(32, 60, 60, 20); // C4
    seq.addNote(36, 64, 60, 20); // E4
    seq.addNote(40, 67, 55, 20); // G4
    seq.addNote(44, 74, 50, 20); // D5 (Common tone)

    // 64-96: Fmaj7#11 (Ethereal)
    seq.addNote(64, 53, 65, 20); // F3
    seq.addNote(64, 57, 60, 20); // A3
    seq.addNote(68, 60, 60, 20); // C4
    seq.addNote(72, 65, 55, 20); // F4
    seq.addNote(76, 71, 50, 20); // B4 (The #11)

    // 96-128: G6 -> C (Resolution)
    seq.addNote(96, 55, 60, 16); // G3
    seq.addNote(96, 59, 55, 16); // B3
    seq.addNote(100, 62, 55, 16); // D4
    seq.addNote(104, 64, 50, 16); // E4

    seq.addNote(112, 60, 50, 16); // Fade into C
}

function setupTexturePattern(channel: Channel) {
    const seq = channel.getSequencer();
    seq.clearAll();
    // 128 steps of sparse sparkles
    const scale = [72, 74, 76, 79, 81, 84, 88]; // C Major Pentatonic extended

    // Random-ish placements but composed
    const spots = [4, 12, 28,
        36, 44, 58,
        70, 78, 88,
        100, 110, 120];

    spots.forEach(step => {
        const note = scale[Math.floor(Math.random() * scale.length)];
        seq.addNote(step, note, 50, 6);
    });
}

function setupWindPattern(channel: Channel) {
    const seq = channel.getSequencer();
    seq.clearAll();
    // High air layer
    // 0-64
    seq.addNote(0, 72, 30, 48); // C5
    // 64-128
    seq.addNote(64, 76, 30, 48); // E5
}
