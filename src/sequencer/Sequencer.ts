/**
 * Step Sequencer
 * 16/32/64 step sequencer with BPM sync
 * Supports polyphonic notes (chords) per step
 */

import { SynthEngine } from '../synth/SynthEngine';

export interface NoteEvent {
    note: number;        // MIDI note (0-127)
    velocity: number;    // 0-127
    gate: number;        // Gate length in steps (e.g., 1.0 = 1 step)
}

export interface Step {
    notes: NoteEvent[];  // Array of notes for polyphony (chords)
    tie: boolean;        // Tie to next step
    probability: number; // 0-1
    microShift: number;  // ms offset
}

export class Sequencer {
    private synth: SynthEngine;
    private steps: Step[] = [];
    private length: 16 | 32 | 64 | 128 = 16;
    private bpm: number = 120;
    private _swing: number = 0; // 0-100
    private humanize = { timing: 0, velocity: 0 };

    private currentStep: number = 0;
    private isPlaying: boolean = false;
    private intervalId: number | null = null;
    private activeNotes: Set<number> = new Set();

    private onStepChange: ((step: number) => void) | null = null;

    constructor(synth: SynthEngine) {
        this.synth = synth;
        this.initSteps();
    }

    private initSteps(): void {
        this.steps = [];
        for (let i = 0; i < 128; i++) {
            this.steps.push({
                notes: [],
                tie: false,
                probability: 1.0,
                microShift: 0
            });
        }
    }

    /**
     * Add a note to a step (supports multiple notes per step)
     */
    addNote(stepIndex: number, note: number, velocity: number = 100, gate: number = 1.0): void {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;

        // Check if note already exists at this step
        const existingIndex = this.steps[stepIndex].notes.findIndex(n => n.note === note);
        if (existingIndex >= 0) {
            // Update existing note
            this.steps[stepIndex].notes[existingIndex] = { note, velocity, gate };
        } else {
            // Add new note
            this.steps[stepIndex].notes.push({ note, velocity, gate });
        }
    }

    /**
     * Remove a specific note from a step
     */
    removeNote(stepIndex: number, note: number): void {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;

        this.steps[stepIndex].notes = this.steps[stepIndex].notes.filter(n => n.note !== note);
    }

    /**
     * Update a specific note in a step
     */
    updateNote(stepIndex: number, note: number, data: Partial<NoteEvent>): void {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;

        const noteEvent = this.steps[stepIndex].notes.find(n => n.note === note);
        if (noteEvent) {
            Object.assign(noteEvent, data);
        }
    }

    /**
     * Get a specific note from a step
     */
    getNote(stepIndex: number, note: number): NoteEvent | null {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return null;

        return this.steps[stepIndex].notes.find(n => n.note === note) || null;
    }

    /**
     * Get all notes at a step
     */
    getNotesAt(stepIndex: number): NoteEvent[] {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return [];
        return this.steps[stepIndex].notes;
    }

    /**
     * Check if a note exists at a step
     */
    hasNote(stepIndex: number, note: number): boolean {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return false;
        return this.steps[stepIndex].notes.some(n => n.note === note);
    }

    /**
     * Set step data (for step-level properties like tie, probability)
     */
    setStep(index: number, data: Partial<Step>): void {
        if (index >= 0 && index < this.steps.length) {
            Object.assign(this.steps[index], data);
        }
    }

    /**
     * Get step data
     */
    getStep(index: number): Step | null {
        return this.steps[index] || null;
    }

    /**
     * Get all steps (up to current length)
     */
    getSteps(): Step[] {
        return this.steps.slice(0, this.length);
    }

    /**
     * Set sequence length
     */
    setLength(length: 16 | 32 | 64 | 128): void {
        this.length = length;
    }

    /**
     * Set BPM
     */
    setBpm(bpm: number): void {
        this.bpm = Math.max(20, Math.min(300, bpm));

        // If playing, restart with new tempo
        if (this.isPlaying) {
            this.stop();
            this.play();
        }
    }

    /**
     * Set swing amount (0-100)
     */
    setSwing(swing: number): void {
        this._swing = Math.max(0, Math.min(100, swing));
    }

    /**
     * Set humanize amounts
     */
    setHumanize(timing: number, velocity: number): void {
        this.humanize.timing = timing;
        this.humanize.velocity = velocity;
    }

    /**
     * Set step change callback
     */
    onStep(callback: (step: number) => void): void {
        this.onStepChange = callback;
    }

    /**
     * Start playback
     */
    play(): void {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.currentStep = 0;

        const stepTimeMs = (60000 / this.bpm) / 4; // 16th notes

        this.intervalId = window.setInterval(() => {
            this.tick();
        }, stepTimeMs);

        // Play first step immediately
        this.tick();
    }

    /**
     * Stop playback
     */
    stop(): void {
        this.isPlaying = false;

        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // Release all active notes
        this.activeNotes.forEach(note => {
            this.synth.noteOff(note);
        });
        this.activeNotes.clear();

        this.currentStep = 0;
    }

    /**
     * Check if playing
     */
    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Get current step
     */
    getCurrentStep(): number {
        return this.currentStep;
    }

    /**
     * Process one step
     */
    private tick(): void {
        const step = this.steps[this.currentStep];

        // Check probability
        if (Math.random() > step.probability) {
            this.advanceStep();
            return;
        }

        // Release previous notes if not tied
        const prevStep = this.steps[(this.currentStep - 1 + this.length) % this.length];
        if (!prevStep.tie) {
            this.activeNotes.forEach(note => {
                this.synth.noteOff(note);
            });
            this.activeNotes.clear();
        }

        // Play all notes in this step
        for (const noteEvent of step.notes) {
            if (noteEvent.note >= 0 && noteEvent.note <= 127) {
                // Apply humanization
                let velocity = noteEvent.velocity;
                if (this.humanize.velocity > 0) {
                    velocity += (Math.random() - 0.5) * this.humanize.velocity * 2;
                    velocity = Math.max(1, Math.min(127, Math.round(velocity)));
                }

                this.synth.noteOn(noteEvent.note, velocity);
                this.activeNotes.add(noteEvent.note);

                // Schedule note off based on gate (if not tied)
                if (!step.tie) {
                    const stepTimeMs = (60000 / this.bpm) / 4;
                    const gateTimeMs = stepTimeMs * noteEvent.gate;
                    const noteToRelease = noteEvent.note;

                    setTimeout(() => {
                        if (this.activeNotes.has(noteToRelease)) {
                            this.synth.noteOff(noteToRelease);
                            this.activeNotes.delete(noteToRelease);
                        }
                    }, gateTimeMs);
                }
            }
        }

        // Callback
        if (this.onStepChange) {
            this.onStepChange(this.currentStep);
        }

        this.advanceStep();
    }

    private advanceStep(): void {
        this.currentStep = (this.currentStep + 1) % this.length;
    }

    /**
     * Load a pattern (array of MIDI notes, -1 for rest)
     * Legacy support - single note per step
     */
    loadPattern(notes: number[]): void {
        for (let i = 0; i < Math.min(notes.length, this.length); i++) {
            if (notes[i] >= 0) {
                this.addNote(i, notes[i], 100, 1.0);
            }
        }
    }

    /**
     * Create demo pattern - Ambient Pad melody with chords
     */
    loadDemoPattern(): void {
        // Reset all steps first
        this.initSteps();

        // Create an ambient chord progression
        // Step 0: C major chord (C3, E3, G3)
        this.addNote(0, 48, 80, 4.0);  // C3
        this.addNote(0, 52, 75, 4.0);  // E3
        this.addNote(0, 55, 70, 4.0);  // G3

        // Step 4: Am chord (A2, C3, E3)
        this.addNote(4, 45, 75, 4.0);  // A2
        this.addNote(4, 48, 70, 4.0);  // C3
        this.addNote(4, 52, 65, 4.0);  // E3

        // Step 8: F major (F2, A2, C3)
        this.addNote(8, 41, 80, 4.0);  // F2
        this.addNote(8, 45, 75, 4.0);  // A2
        this.addNote(8, 48, 70, 4.0);  // C3

        // Step 12: G major (G2, B2, D3)
        this.addNote(12, 43, 75, 4.0); // G2
        this.addNote(12, 47, 70, 4.0); // B2
        this.addNote(12, 50, 65, 4.0); // D3
    }

    /**
     * Get BPM
     */
    getBpm(): number {
        return this.bpm;
    }

    /**
     * Get length
     */
    getLength(): number {
        return this.length;
    }

    /**
     * Clear all notes from all steps
     */
    clearAll(): void {
        this.initSteps();
    }

    /**
     * Clear notes from a specific step
     */
    clearStep(stepIndex: number): void {
        if (stepIndex >= 0 && stepIndex < this.steps.length) {
            this.steps[stepIndex].notes = [];
        }
    }
}
