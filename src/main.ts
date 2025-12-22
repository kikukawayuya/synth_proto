/**
 * ES2 Purity Web Synth - Main Entry Point
 * Multi-channel version with mixer-style track management
 */

import { ChannelManager } from './channel/ChannelManager';
import { Channel } from './channel/Channel';
import { ES2_PURITY_PRESET, INIT_PRESET } from './synth/Preset';
import { RotaryKnob, rotaryKnobStyles } from './ui/RotaryKnob';
import { PianoRoll, pianoRollStyles } from './ui/PianoRoll';
import { ChannelStripUI, channelStripStyles } from './ui/ChannelStrip';

// Global instances
let channelManager: ChannelManager;
let channelStripUI: ChannelStripUI;
let pianoRoll: PianoRoll | null = null;
const knobs: Map<string, RotaryKnob> = new Map();

// Keyboard mapping (computer keyboard to MIDI notes)
const keyboardMap: Record<string, number> = {
    'z': 48, 's': 49, 'x': 50, 'd': 51, 'c': 52, 'v': 53, 'g': 54,
    'b': 55, 'h': 56, 'n': 57, 'j': 58, 'm': 59, ',': 60,
    'q': 60, '2': 61, 'w': 62, '3': 63, 'e': 64, 'r': 65, '5': 66,
    't': 67, '6': 68, 'y': 69, '7': 70, 'u': 71, 'i': 72, '9': 73,
    'o': 74, '0': 75, 'p': 76
};

const activeKeys: Set<string> = new Set();

/**
 * Inject component styles
 */
function injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = rotaryKnobStyles + '\n' + pianoRollStyles + '\n' + channelStripStyles;
    document.head.appendChild(style);
}

/**
 * Initialize the application
 */
async function init() {
    injectStyles();

    channelManager = new ChannelManager();

    // Wait for user interaction before starting audio
    const startBtn = document.getElementById('start-audio');
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            await channelManager.initMaster();

            // Create first channel
            const channel1 = await channelManager.createChannel('Pad');
            channel1.getSequencer().loadDemoPattern();

            startBtn.textContent = '✓ Audio Running';
            startBtn.classList.add('active');
            (startBtn as HTMLButtonElement).disabled = true;

            // Update power indicator
            const powerIndicator = document.getElementById('power-indicator');
            if (powerIndicator) {
                powerIndicator.classList.add('active');
            }

            // Setup UI
            setupChannelStrips();
            setupRotaryKnobs();
            setupToggles();
            setupKeyboard();
            setupPianoRollForChannel(channel1);
            setupTransportControls();
            setupPresets();
            setupVisualizer();

            // Start animation loop
            requestAnimationFrame(updateLoop);

            console.log('Multi-channel synth ready!');
        });
    }
}

/**
 * Setup channel strip UI
 */
function setupChannelStrips(): void {
    const container = document.getElementById('channel-strips');
    if (!container) return;

    channelStripUI = new ChannelStripUI(container, channelManager);
    channelStripUI.render();

    // Handle channel selection
    channelStripUI.setOnSelect((channel) => {
        setupPianoRollForChannel(channel);
        updateChannelNameDisplay(channel);
        updateSynthControlsForChannel(channel);
    });

    // Listen for channel changes
    channelManager.setOnSelectionChange((channelId) => {
        const channel = channelId ? channelManager.getChannel(channelId) : null;
        if (channel) {
            setupPianoRollForChannel(channel);
            updateChannelNameDisplay(channel);
        }
    });
}

/**
 * Update channel name displays
 */
function updateChannelNameDisplay(channel: Channel): void {
    const nameEl = document.getElementById('current-channel-name');
    const pianoRollNameEl = document.getElementById('piano-roll-channel-name');

    if (nameEl) nameEl.textContent = channel.name;
    if (pianoRollNameEl) pianoRollNameEl.textContent = channel.name;
}

/**
 * Update synth controls for selected channel
 */
function updateSynthControlsForChannel(channel: Channel): void {
    // In future: update knobs to reflect this channel's synth settings
    // For now, knobs are shared and modify the selected channel
}

/**
 * Setup piano roll for a specific channel
 */
function setupPianoRollForChannel(channel: Channel): void {
    const container = document.getElementById('sequencer-grid');
    if (!container) return;

    // Create piano roll for this channel's sequencer
    pianoRoll = new PianoRoll(container, channel.getSequencer());

    // Update channel name
    updateChannelNameDisplay(channel);
}

/**
 * Setup rotary knobs to replace sliders
 */
function setupRotaryKnobs(): void {
    document.querySelectorAll('input.knob').forEach((input) => {
        const htmlInput = input as HTMLInputElement;
        const paramName = htmlInput.dataset.param;
        if (!paramName) return;

        const container = htmlInput.parentElement;
        if (!container) return;

        const existingLabel = container.querySelector('.knob-label, label');
        const labelText = existingLabel?.textContent || paramName;

        const isLarge = htmlInput.classList.contains('large');
        const isSmall = container.classList.contains('small');

        const knob = new RotaryKnob(container, {
            min: parseFloat(htmlInput.min),
            max: parseFloat(htmlInput.max),
            value: parseFloat(htmlInput.value),
            step: parseFloat(htmlInput.step) || 0.01,
            label: labelText,
            size: isLarge ? 'large' : isSmall ? 'small' : 'normal',
            onChange: (value) => {
                // Apply to selected channel's synth
                const channel = channelManager.getSelectedChannel();
                if (channel) {
                    channel.getSynth().setParam(paramName, value);
                }
            }
        });

        knobs.set(paramName, knob);
        htmlInput.remove();
        existingLabel?.remove();
    });
}

/**
 * Setup toggle switches
 */
function setupToggles(): void {
    document.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach((input) => {
        const checkbox = input as HTMLInputElement;
        const paramName = checkbox.dataset.param;
        if (!paramName) return;

        checkbox.addEventListener('change', () => {
            const channel = channelManager.getSelectedChannel();
            if (channel) {
                channel.getSynth().setParam(paramName, checkbox.checked);
            }
        });
    });
}

/**
 * Setup on-screen keyboard
 */
function setupKeyboard() {
    const keyboard = document.getElementById('keyboard');
    if (!keyboard) return;

    keyboard.innerHTML = '';

    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const startNote = 48; // C3

    for (let octave = 0; octave < 2; octave++) {
        for (let i = 0; i < 12; i++) {
            const midiNote = startNote + octave * 12 + i;
            const isBlack = notes[i].includes('#');

            const key = document.createElement('div');
            key.className = `key ${isBlack ? 'black' : 'white'}`;
            key.dataset.note = String(midiNote);

            key.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const channel = channelManager.getSelectedChannel();
                if (channel) {
                    channel.noteOn(midiNote, 100);
                    key.classList.add('active');
                }
            });

            key.addEventListener('mouseup', () => {
                const channel = channelManager.getSelectedChannel();
                if (channel) {
                    channel.noteOff(midiNote);
                    key.classList.remove('active');
                }
            });

            key.addEventListener('mouseleave', () => {
                const channel = channelManager.getSelectedChannel();
                if (channel) {
                    channel.noteOff(midiNote);
                    key.classList.remove('active');
                }
            });

            keyboard.appendChild(key);
        }
    }

    // Computer keyboard input
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;

        const channel = channelManager.getSelectedChannel();
        if (!channel || !channel.isInitialized()) return;

        const note = keyboardMap[e.key.toLowerCase()];
        if (note !== undefined && !activeKeys.has(e.key)) {
            activeKeys.add(e.key);
            channel.noteOn(note, 100);

            const keyEl = keyboard.querySelector(`[data-note="${note}"]`);
            if (keyEl) keyEl.classList.add('active');
        }
    });

    document.addEventListener('keyup', (e) => {
        const channel = channelManager.getSelectedChannel();
        if (!channel) return;

        const note = keyboardMap[e.key.toLowerCase()];
        if (note !== undefined) {
            activeKeys.delete(e.key);
            channel.noteOff(note);

            const keyEl = keyboard.querySelector(`[data-note="${note}"]`);
            if (keyEl) keyEl.classList.remove('active');
        }
    });
}

/**
 * Animation loop for piano roll and visualizer
 */
function updateLoop(): void {
    if (pianoRoll && channelManager.isPlaying) {
        pianoRoll.update();
    }
    requestAnimationFrame(updateLoop);
}

/**
 * Setup transport controls (play/stop for all channels)
 */
function setupTransportControls(): void {
    const playBtn = document.getElementById('seq-play');
    const stopBtn = document.getElementById('seq-stop');
    const lengthSelect = document.getElementById('seq-length') as HTMLSelectElement;
    const swingSlider = document.getElementById('seq-swing') as HTMLInputElement;
    const bpmInput = document.getElementById('bpm') as HTMLInputElement;

    // Play all channels
    playBtn?.addEventListener('click', () => {
        channelManager.play();
        playBtn.classList.add('active');
        stopBtn?.classList.remove('active');
    });

    // Stop all channels
    stopBtn?.addEventListener('click', () => {
        channelManager.stop();
        stopBtn.classList.add('active');
        playBtn?.classList.remove('active');
        pianoRoll?.update();
    });

    // Length change for all channels
    lengthSelect?.addEventListener('change', () => {
        channelManager.setLength(parseInt(lengthSelect.value) as 16 | 32 | 64 | 128);
        pianoRoll?.update();
    });

    // Swing (for selected channel)
    swingSlider?.addEventListener('input', () => {
        const channel = channelManager.getSelectedChannel();
        if (channel) {
            channel.getSequencer().setSwing(parseInt(swingSlider.value));
        }
    });

    // BPM for all channels
    bpmInput?.addEventListener('change', () => {
        channelManager.setBpm(parseInt(bpmInput.value));
    });

    // Listen for transport changes
    channelManager.setOnTransportChange((isPlaying) => {
        if (isPlaying) {
            playBtn?.classList.add('active');
            stopBtn?.classList.remove('active');
        } else {
            stopBtn?.classList.add('active');
            playBtn?.classList.remove('active');
        }
    });
}

/**
 * Setup preset controls (for selected channel)
 */
function setupPresets(): void {
    const presetSelect = document.getElementById('preset-select') as HTMLSelectElement;
    const presetLoad = document.getElementById('preset-load');

    presetLoad?.addEventListener('click', () => {
        const channel = channelManager.getSelectedChannel();
        if (!channel) return;

        const value = presetSelect.value;
        if (value === 'purity') {
            channel.loadPreset(ES2_PURITY_PRESET);
        } else if (value === 'init') {
            channel.loadPreset(INIT_PRESET);
        }

        updateKnobsFromPreset();
    });
}

/**
 * Update knob visuals from current preset
 */
function updateKnobsFromPreset(): void {
    // TODO: Update all knobs to match loaded preset values
}

/**
 * Setup visualizer (uses master analyser)
 */
function setupVisualizer() {
    const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = 60;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
        requestAnimationFrame(draw);

        if (!ctx) return;

        const analyser = channelManager.getMasterAnalyser();
        if (!analyser) {
            ctx.fillStyle = 'rgba(26, 30, 36, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgba(26, 30, 36, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            const hue = 180 + (dataArray[i] / 255) * 40;
            ctx.fillStyle = `hsla(${hue}, 60%, 50%, 0.7)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;

            if (x > canvas.width) break;
        }
    }

    draw();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
