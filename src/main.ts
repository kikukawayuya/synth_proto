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
import { JitaiController, JitaiPanel, jitaiPanelStyles } from './jitai';
import { MasterSection, masterSectionStyles } from './ui/MasterSection';
import { JitaiVisualization, jitaiVisualizationStyles } from './ui/JitaiVisualization';
import { MUSIC_PRESETS, loadMusicPreset } from './presets/MusicPresets';

// Global instances
let channelManager: ChannelManager;
let channelStripUI: ChannelStripUI;
let pianoRoll: PianoRoll | null = null;
let jitaiController: JitaiController | null = null;
let jitaiPanel: JitaiPanel | null = null;
let jitaiVisualization: JitaiVisualization | null = null;
let masterSection: MasterSection | null = null;
let synthPopup: HTMLElement | null = null;
let currentPresetName: string = 'Sleep Drone';  // Track current preset name
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
    style.textContent = rotaryKnobStyles + '\n' + pianoRollStyles + '\n' + channelStripStyles + '\n' + jitaiPanelStyles + '\n' + masterSectionStyles + '\n' + jitaiVisualizationStyles + '\n' + synthPopupStyles;
    document.head.appendChild(style);
}

// Synth popup styles
const synthPopupStyles = `
.synth-popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.synth-popup {
    background: linear-gradient(135deg, #1a2530 0%, #0d1520 100%);
    border: 1px solid #3a5570;
    border-radius: 12px;
    padding: 20px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    color: #c8d4e0;
}

.synth-popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #3a5570;
}

.synth-popup-title {
    font-size: 16px;
    font-weight: 600;
    color: #4a90b8;
}

.synth-popup-close {
    background: none;
    border: none;
    color: #6a8aa8;
    font-size: 24px;
    cursor: pointer;
    padding: 4px 8px;
}

.synth-popup-close:hover {
    color: #e06040;
}

.synth-popup-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
}

/* Music Preset Modal */
.preset-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.preset-modal {
    background: linear-gradient(135deg, #1a2530 0%, #0d1520 100%);
    border: 1px solid #3a5570;
    border-radius: 16px;
    padding: 24px;
    width: 90%;
    max-width: 800px;
    max-height: 80vh;
    overflow-y: auto;
    color: #c8d4e0;
}

.preset-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #3a5570;
}

.preset-modal-title {
    font-size: 20px;
    font-weight: 600;
    color: #4a90b8;
    display: flex;
    align-items: center;
    gap: 10px;
}

.preset-modal-close {
    background: none;
    border: none;
    color: #6a8aa8;
    font-size: 28px;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
}

.preset-modal-close:hover {
    color: #e06040;
}

.preset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
}

.preset-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #2a3540;
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.preset-card:hover {
    background: rgba(74, 144, 184, 0.15);
    border-color: #4a90b8;
    transform: translateY(-2px);
}

.preset-card-name {
    font-size: 15px;
    font-weight: 600;
    color: #e0e8f0;
    margin-bottom: 8px;
}

.preset-card-description {
    font-size: 12px;
    color: #7a8a9a;
    line-height: 1.4;
    margin-bottom: 10px;
}

.preset-card-meta {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: #5a6a7a;
}

.preset-card-meta span {
    display: flex;
    align-items: center;
    gap: 4px;
}
`;

/**
 * Initialize the application
 */
async function init() {
    injectStyles();

    channelManager = new ChannelManager();

    // Wait for user interaction before starting audio
    const startBtn = document.getElementById('start-audio');

    async function startAudio() {
        if (channelManager.getChannelCount() > 0) return; // Already started

        await channelManager.initMaster();

        // Load Sleep Drone by default (optimal for JITAI research)
        const { generateDroneProject } = await import('./utils/droneGenerator');
        await generateDroneProject(channelManager);

        if (startBtn) {
            startBtn.textContent = '✓ Audio Running';
            startBtn.classList.add('active');
            (startBtn as HTMLButtonElement).disabled = true;
        }

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

        // Setup piano roll for the selected channel
        const selectedChannel = channelManager.getSelectedChannel();
        if (selectedChannel) {
            setupPianoRollForChannel(selectedChannel);
            updateSynthControlsForChannel(selectedChannel);
        }

        setupTransportControls();
        setupPresets();
        setupVisualizer();

        // Start animation loop
        requestAnimationFrame(updateLoop);

        // Expose for debugging/verification
        (window as any).channelManager = channelManager;

        // Setup JITAI Research Panel
        setupJitaiPanel();

        // Setup Master Section (Volume + EQ)
        setupMasterSection();

        // Auto-play the drone
        channelManager.play();
    }

    // Click handler
    startBtn?.addEventListener('click', startAudio);

    // Spacebar handler - toggle play/stop
    document.addEventListener('keydown', (e) => {
        // Ignore if focus is on input elements
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            if (channelManager.getChannelCount() === 0) {
                startAudio();
            } else {
                // Toggle play/stop
                if (channelManager.isPlaying) {
                    channelManager.stop();
                } else {
                    channelManager.play();
                }
            }
        }
    });
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

    // Handle synth popup open
    channelStripUI.setOnSynthOpen((channel) => {
        openSynthPopup(channel);
    });

    // Listen for channel changes
    channelManager.setOnSelectionChange((channelId) => {
        const channel = channelId ? channelManager.getChannel(channelId) : null;
        if (channel) {
            setupPianoRollForChannel(channel);
            updateChannelNameDisplay(channel);
            updateSynthControlsForChannel(channel);
        }
    });
}

/**
 * Open synth popup for a channel
 */
function openSynthPopup(channel: Channel): void {
    // Close existing popup
    closeSynthPopup();

    // Get synth section from DOM
    const synthSection = document.querySelector('.synth-section');
    if (!synthSection) return;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'synth-popup-overlay';
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSynthPopup();
    });

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'synth-popup';

    // Header
    const header = document.createElement('div');
    header.className = 'synth-popup-header';
    header.innerHTML = `
        <span class="synth-popup-title">Synth: ${channel.name}</span>
        <button class="synth-popup-close">&times;</button>
    `;
    header.querySelector('.synth-popup-close')?.addEventListener('click', closeSynthPopup);
    popup.appendChild(header);

    // Clone synth section content
    const content = document.createElement('div');
    content.className = 'synth-popup-content';
    content.innerHTML = synthSection.innerHTML;
    popup.appendChild(content);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    synthPopup = overlay;

    // Update knobs in popup to reflect this channel's settings
    updateSynthControlsForChannel(channel);
}

/**
 * Close synth popup
 */
function closeSynthPopup(): void {
    if (synthPopup) {
        synthPopup.remove();
        synthPopup = null;
    }
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
    const params = channel.getSynth().getParams();

    // Update all knobs to reflect this channel's synth settings
    knobs.forEach((knob, paramName) => {
        if (params[paramName] !== undefined) {
            knob.setValueSilent(params[paramName]);
        }
    });
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

    // Save/Load project buttons
    const saveBtn = document.getElementById('project-save');
    const loadBtn = document.getElementById('project-load');

    saveBtn?.addEventListener('click', () => {
        channelManager.saveToLocalStorage();
        showNotification('Project saved!');
    });

    // Load button - show music preset modal
    loadBtn?.addEventListener('click', () => {
        openPresetModal();
    });
}

/**
 * Open music preset selection modal
 */
function openPresetModal(): void {
    // Close existing modal
    closePresetModal();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'preset-modal-overlay';
    overlay.id = 'preset-modal-overlay';
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePresetModal();
    });

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'preset-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'preset-modal-header';
    header.innerHTML = `
        <div class="preset-modal-title">
            <span>🎵</span>
            <span>Sleep & Relaxation Presets</span>
        </div>
        <button class="preset-modal-close">&times;</button>
    `;
    header.querySelector('.preset-modal-close')?.addEventListener('click', closePresetModal);
    modal.appendChild(header);

    // Preset grid
    const grid = document.createElement('div');
    grid.className = 'preset-grid';

    MUSIC_PRESETS.forEach(preset => {
        const card = document.createElement('div');
        card.className = 'preset-card';
        card.innerHTML = `
            <div class="preset-card-name">${preset.name}</div>
            <div class="preset-card-description">${preset.description}</div>
            <div class="preset-card-meta">
                <span>♩ ${preset.bpm} BPM</span>
                <span>⎯ ${preset.length} steps</span>
            </div>
        `;
        card.addEventListener('click', async () => {
            closePresetModal();
            showNotification(`Loading ${preset.name}...`);

            await loadMusicPreset(channelManager, preset.id);

            // Update current preset name
            currentPresetName = preset.name;
            updatePresetNameDisplay();

            // Re-render UI
            channelStripUI.render();
            const selectedChannel = channelManager.getSelectedChannel();
            if (selectedChannel) {
                setupPianoRollForChannel(selectedChannel);
                updateSynthControlsForChannel(selectedChannel);
            }

            // Update BPM display
            const bpmInput = document.getElementById('bpm') as HTMLInputElement;
            if (bpmInput) {
                bpmInput.value = String(preset.bpm);
            }

            // Auto-play
            channelManager.play();

            showNotification(`${preset.name} loaded!`);
        });
        grid.appendChild(card);
    });

    modal.appendChild(grid);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

/**
 * Close preset modal
 */
function closePresetModal(): void {
    const overlay = document.getElementById('preset-modal-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Update preset name display
 */
function updatePresetNameDisplay(): void {
    const displayEl = document.getElementById('current-preset-name');
    if (displayEl) {
        displayEl.textContent = currentPresetName;
    }
}

/**
 * Update knob visuals from current preset
 */
function updateKnobsFromPreset(): void {
    const channel = channelManager.getSelectedChannel();
    if (channel) {
        updateSynthControlsForChannel(channel);
    }
}

/**
 * Show a brief notification message
 */
function showNotification(message: string): void {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4a90b8;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 1000;
        animation: fadeInOut 2s ease-in-out forwards;
    `;

    // Add animation style if not exists
    if (!document.getElementById('notification-style')) {
        const style = document.createElement('style');
        style.id = 'notification-style';
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(-10px); }
                15% { opacity: 1; transform: translateY(0); }
                85% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

/**
 * Setup JITAI Research Panel
 */
function setupJitaiPanel(): void {
    // Create JITAI controller
    jitaiController = new JitaiController(channelManager);

    // Create JITAI panel UI (input controls on the right)
    jitaiPanel = new JitaiPanel(jitaiController);
    document.body.appendChild(jitaiPanel.getElement());

    // Create JITAI visualization panel (replace synth section)
    jitaiVisualization = new JitaiVisualization(jitaiController);

    // Insert visualization panel where synth section was
    const synthSection = document.querySelector('.synth-section');
    if (synthSection) {
        // Hide the original synth section (keep for popup)
        (synthSection as HTMLElement).style.display = 'none';

        // Insert visualization panel before mixer section
        const mixerSection = document.querySelector('.mixer-section');
        if (mixerSection && mixerSection.parentElement) {
            mixerSection.parentElement.insertBefore(jitaiVisualization.getElement(), mixerSection);
        }
    }

    // Expose for debugging
    (window as any).jitaiController = jitaiController;

    console.log('JITAI Research Panel initialized');
}

/**
 * Setup Master Section (Volume + EQ)
 */
function setupMasterSection(): void {
    masterSection = new MasterSection(channelManager);
    document.body.appendChild(masterSection.getElement());
    console.log('Master Section initialized');
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
