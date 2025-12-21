/**
 * ES2 Purity Web Synth - Main Entry Point
 * With Rotary Knobs and Piano Roll
 */

import { SynthEngine } from './synth/SynthEngine';
import { Sequencer } from './sequencer/Sequencer';
import { ES2_PURITY_PRESET, INIT_PRESET, Preset } from './synth/Preset';
import { RotaryKnob, rotaryKnobStyles } from './ui/RotaryKnob';
import { PianoRoll, pianoRollStyles } from './ui/PianoRoll';

// Global instances
let synth: SynthEngine;
let sequencer: Sequencer;
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
    style.textContent = rotaryKnobStyles + '\n' + pianoRollStyles;
    document.head.appendChild(style);
}

/**
 * Initialize the application
 */
async function init() {
    injectStyles();

    synth = new SynthEngine();

    // Wait for user interaction before starting audio
    const startBtn = document.getElementById('start-audio');
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            await synth.init();
            sequencer = new Sequencer(synth);

            startBtn.textContent = '✓ Audio Running';
            startBtn.classList.add('active');
            (startBtn as HTMLButtonElement).disabled = true;

            // Update power indicator
            const powerIndicator = document.getElementById('power-indicator');
            if (powerIndicator) {
                powerIndicator.classList.add('active');
            }

            // Load default preset
            synth.loadPreset(ES2_PURITY_PRESET);

            // Setup UI
            setupRotaryKnobs();
            setupKeyboard();
            setupPianoRoll();
            setupSequencerControls();
            setupRotaryKnobs();
            setupToggles();
            setupKeyboard();
            setupPianoRoll();
            setupSequencerControls();
            setupPresets();
            setupVisualizer();

            // Start piano roll animation loop
            requestAnimationFrame(updatePianoRoll);

            console.log('Synth ready!');
        });
    }
}

/**
 * Setup rotary knobs to replace sliders
 */
function setupRotaryKnobs(): void {
    // Find all knob inputs and replace with rotary knobs
    document.querySelectorAll('input.knob').forEach((input) => {
        const htmlInput = input as HTMLInputElement;
        const paramName = htmlInput.dataset.param;
        if (!paramName) return;

        const container = htmlInput.parentElement;
        if (!container) return;

        // Get existing label
        const existingLabel = container.querySelector('.knob-label, label');
        const labelText = existingLabel?.textContent || paramName;

        // Determine size
        const isLarge = htmlInput.classList.contains('large');
        const isSmall = container.classList.contains('small');

        // Create rotary knob
        const knob = new RotaryKnob(container, {
            min: parseFloat(htmlInput.min),
            max: parseFloat(htmlInput.max),
            value: parseFloat(htmlInput.value),
            step: parseFloat(htmlInput.step) || 0.01,
            label: labelText,
            size: isLarge ? 'large' : isSmall ? 'small' : 'normal',
            onChange: (value) => {
                synth.setParam(paramName, value);
            }
        });

        knobs.set(paramName, knob);

        // Remove original input and label
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
            synth.setParam(paramName, checkbox.checked);
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

    // Create 2 octaves (C3 to B4)
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const startNote = 48; // C3

    for (let octave = 0; octave < 2; octave++) {
        for (let i = 0; i < 12; i++) {
            const midiNote = startNote + octave * 12 + i;
            const isBlack = notes[i].includes('#');

            const key = document.createElement('div');
            key.className = `key ${isBlack ? 'black' : 'white'}`;
            key.dataset.note = String(midiNote);

            // Mouse events
            key.addEventListener('mousedown', (e) => {
                e.preventDefault();
                synth.noteOn(midiNote, 100);
                key.classList.add('active');
            });

            key.addEventListener('mouseup', () => {
                synth.noteOff(midiNote);
                key.classList.remove('active');
            });

            key.addEventListener('mouseleave', () => {
                synth.noteOff(midiNote);
                key.classList.remove('active');
            });

            keyboard.appendChild(key);
        }
    }

    // Computer keyboard input
    document.addEventListener('keydown', (e) => {
        if (e.repeat || !synth.isInitialized()) return;

        const note = keyboardMap[e.key.toLowerCase()];
        if (note !== undefined && !activeKeys.has(e.key)) {
            activeKeys.add(e.key);
            synth.noteOn(note, 100);

            // Highlight key
            const keyEl = keyboard.querySelector(`[data-note="${note}"]`);
            if (keyEl) keyEl.classList.add('active');
        }
    });

    document.addEventListener('keyup', (e) => {
        const note = keyboardMap[e.key.toLowerCase()];
        if (note !== undefined) {
            activeKeys.delete(e.key);
            synth.noteOff(note);

            // Remove highlight
            const keyEl = keyboard.querySelector(`[data-note="${note}"]`);
            if (keyEl) keyEl.classList.remove('active');
        }
    });
}

/**
 * Setup Piano Roll editor
 */
function setupPianoRoll(): void {
    const container = document.getElementById('sequencer-grid');
    if (!container || !sequencer) return;

    // Load demo pattern
    sequencer.loadDemoPattern();

    // Create piano roll
    pianoRoll = new PianoRoll(container, sequencer);

    // Update piano roll when step changes
    sequencer.onStep((step) => {
        // Piano roll will update in animation loop
    });
}

/**
 * Animation loop for piano roll
 */
function updatePianoRoll(): void {
    if (pianoRoll && sequencer?.getIsPlaying()) {
        pianoRoll.update();
    }
    requestAnimationFrame(updatePianoRoll);
}

/**
 * Setup sequencer transport controls
 */
function setupSequencerControls(): void {
    const playBtn = document.getElementById('seq-play');
    const stopBtn = document.getElementById('seq-stop');
    const lengthSelect = document.getElementById('seq-length') as HTMLSelectElement;
    const swingSlider = document.getElementById('seq-swing') as HTMLInputElement;
    const bpmInput = document.getElementById('bpm') as HTMLInputElement;

    // Transport controls
    playBtn?.addEventListener('click', () => {
        sequencer.play();
        playBtn.classList.add('active');
        stopBtn?.classList.remove('active');
    });

    stopBtn?.addEventListener('click', () => {
        sequencer.stop();
        stopBtn.classList.add('active');
        playBtn?.classList.remove('active');
        pianoRoll?.update();
    });

    // Length change
    lengthSelect?.addEventListener('change', () => {
        sequencer.setLength(parseInt(lengthSelect.value) as 16 | 32 | 64 | 128);
        pianoRoll?.update();
    });

    // Swing
    swingSlider?.addEventListener('input', () => {
        sequencer.setSwing(parseInt(swingSlider.value));
    });

    // BPM
    bpmInput?.addEventListener('change', () => {
        sequencer.setBpm(parseInt(bpmInput.value));
    });
}

/**
 * Setup preset controls
 */
function setupPresets(): void {
    const presetSelect = document.getElementById('preset-select') as HTMLSelectElement;
    const presetLoad = document.getElementById('preset-load');

    presetLoad?.addEventListener('click', () => {
        const value = presetSelect.value;
        if (value === 'purity') {
            synth.loadPreset(ES2_PURITY_PRESET);
        } else if (value === 'init') {
            synth.loadPreset(INIT_PRESET);
        }

        // Update knob values from preset
        updateKnobsFromPreset();
    });
}

/**
 * Update knob visuals from current preset
 */
function updateKnobsFromPreset(): void {
    // This would update all knobs to match loaded preset values
    // Implementation depends on how params are mapped
}

/**
 * Setup visualizer
 */
function setupVisualizer() {
    const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = 60;
    }
    resize();
    window.addEventListener('resize', resize);

    // Draw loop
    function draw() {
        requestAnimationFrame(draw);

        if (!ctx) return;

        const analyser = synth.getAnalyser();
        if (!analyser) {
            ctx.fillStyle = 'rgba(26, 30, 36, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Clear with fade
        ctx.fillStyle = 'rgba(26, 30, 36, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw bars
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;

            // Blue-green gradient
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
