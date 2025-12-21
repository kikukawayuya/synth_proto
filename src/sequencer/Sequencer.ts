/**
 * Step Sequencer
 * 16/32/64 step sequencer with BPM sync
 */

import { SynthEngine } from '../synth/SynthEngine';

export interface Step {
    note: number;        // MIDI note (0-127), -1 for rest
    velocity: number;    // 0-127
    gate: number;        // 0-1 (percentage of step length)
    tie: boolean;        // Tie to next step
    probability: number; // 0-1
    microShift: number;  // ms offset
}

export class Sequencer {
    private synth: SynthEngine;
    private steps: Step[] = [];
    private length: 16 | 32 | 64 | 128 = 16;
    private bpm: number = 120;
    private swing: number = 0; // 0-100
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
                note: -1,
                velocity: 100,
                gate: 0.8,
                tie: false,
                probability: 1.0,
                microShift: 0
            });
        }
    }

    /**
     * Set step data
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
        this.swing = Math.max(0, Math.min(100, swing));
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

        // Release previous note if not tied
        const prevStep = this.steps[(this.currentStep - 1 + this.length) % this.length];
        if (!prevStep.tie) {
            this.activeNotes.forEach(note => {
                this.synth.noteOff(note);
            });
            this.activeNotes.clear();
        }

        // Play note if valid
        if (step.note >= 0 && step.note <= 127) {
            // Apply humanization
            let velocity = step.velocity;
            if (this.humanize.velocity > 0) {
                velocity += (Math.random() - 0.5) * this.humanize.velocity * 2;
                velocity = Math.max(1, Math.min(127, Math.round(velocity)));
            }

            this.synth.noteOn(step.note, velocity);
            this.activeNotes.add(step.note);

            // Schedule note off based on gate (if not tied)
            if (!step.tie) {
                const stepTimeMs = (60000 / this.bpm) / 4;
                const gateTimeMs = stepTimeMs * step.gate;

                setTimeout(() => {
                    if (this.activeNotes.has(step.note)) {
                        this.synth.noteOff(step.note);
                        this.activeNotes.delete(step.note);
                    }
                }, gateTimeMs);
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
     */
    loadPattern(notes: number[]): void {
        for (let i = 0; i < Math.min(notes.length, this.length); i++) {
            this.steps[i].note = notes[i];
        }
    }

    /**
     * Create demo pattern - Ambient Pad melody from Logic Pro
     * Based on the user-provided piano roll screenshot
     */
    loadDemoPattern(): void {
        // Reset all steps first
        this.initSteps();

        // Ambient Pad melody pattern (reading from screenshot)
        // The piano roll shows a melody around C2-C3 range
        // Beat 1: E3 (long)
        this.steps[0] = { note: 52, velocity: 80, gate: 2.0, tie: false, probability: 1.0, microShift: 0 }; // E3

        // Beat 4-5: D3 and B2
        this.steps[4] = { note: 50, velocity: 75, gate: 1.5, tie: false, probability: 1.0, microShift: 0 }; // D3
        this.steps[4] = { note: 47, velocity: 60, gate: 0.5, tie: false, probability: 1.0, microShift: 0 }; // B2 (overlaps)

        // Actually, looking more carefully at the image:
        // The notes appear at these positions (1/16 note grid):

        // Clear and set proper pattern
        this.initSteps();

        // Reading the piano roll more carefully (C2-C3 area):
        // Step 0-1: Around E3 area, long note
        this.steps[0].note = 52;  // E3
        this.steps[0].velocity = 80;
        this.steps[0].gate = 2.0;

        // Step 4: D3 area
        this.steps[4].note = 50;  // D3
        this.steps[4].velocity = 75;
        this.steps[4].gate = 1.5;

        // Step 5: B2
        this.steps[5].note = 47;  // B2
        this.steps[5].velocity = 70;
        this.steps[5].gate = 0.8;

        // Steps 6-7: Sequence around G2-A2
        this.steps[6].note = 45;  // A2
        this.steps[6].velocity = 65;
        this.steps[6].gate = 0.8;

        this.steps[7].note = 43;  // G2
        this.steps[7].velocity = 65;
        this.steps[7].gate = 0.8;

        this.steps[8].note = 45;  // A2
        this.steps[8].velocity = 60;
        this.steps[8].gate = 0.8;

        // Steps 9-10: G2 and E2 (longer)
        this.steps[9].note = 43;  // G2
        this.steps[9].velocity = 60;
        this.steps[9].gate = 0.8;

        this.steps[10].note = 40; // E2
        this.steps[10].velocity = 55;
        this.steps[10].gate = 1.5;

        // Steps 11-12: continuation
        this.steps[12].note = 43; // G2
        this.steps[12].velocity = 60;
        this.steps[12].gate = 1.5;
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
}
