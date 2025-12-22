/**
 * Piano Roll Editor - Enhanced Version
 * Logic Pro style MIDI editor with:
 * - Note selection
 * - Duration editing (left/right drag)
 * - Velocity editing (up/down drag while holding)
 * - Delete key to remove notes
 * - Double-click to create notes
 */

import { Sequencer, Step } from '../sequencer/Sequencer';

interface NoteData {
    step: number;
    note: number;
    velocity: number;
    gate: number;
}

interface SelectedNote {
    step: number;
    note: number;
}

type EditMode = 'none' | 'select' | 'duration' | 'velocity' | 'move' | 'draw';

export class PianoRoll {
    private container: HTMLElement;
    private sequencer: Sequencer;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    // Piano roll dimensions
    private pianoWidth: number = 60;
    private noteHeight: number = 14;
    private stepWidth: number = 32;
    private headerHeight: number = 26;

    // Note range (MIDI notes)
    private minNote: number = 36; // C2
    private maxNote: number = 84; // C6

    // State
    private editMode: EditMode = 'none';
    private selectedNote: SelectedNote | null = null;
    private hoveredNote: SelectedNote | null = null;
    private isDragging: boolean = false;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private dragStartValue: number = 0;
    private scrollLeft: number = 0;
    private scrollTop: number = 0;
    private lastClickTime: number = 0;
    private dragStartStep: number = 0;
    private dragStartNote: number = 0;

    // Colors (Logic Pro style)
    private colors = {
        background: '#1a1e24',
        gridLine: '#2a3038',
        gridLineAccent: '#3a4250',
        pianoWhite: '#e8e8e8',
        pianoBlack: '#2a2a2a',
        pianoPressed: '#4a90b8',
        noteActive: '#c75050',
        noteSelected: '#e08040',
        noteHover: '#d06050',
        velocityLow: '#804020',
        velocityHigh: '#e06040',
        header: '#2a3038',
        headerText: '#a0aab8',
        playhead: '#4ade80',
        resizeHandle: '#ffcc00'
    };

    private onNoteChange: ((step: number, note: number, data: Partial<Step>) => void) | null = null;

    constructor(container: HTMLElement, sequencer: Sequencer) {
        this.container = container;
        this.sequencer = sequencer;

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'piano-roll-canvas';
        this.canvas.tabIndex = 0; // Make focusable for keyboard events
        this.ctx = this.canvas.getContext('2d')!;

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'piano-roll-wrapper';
        wrapper.appendChild(this.canvas);

        container.innerHTML = '';
        container.appendChild(wrapper);

        this.resize();
        this.bindEvents();
        this.render();

        // Initial scroll to middle octave
        this.scrollTop = (this.maxNote - 64) * this.noteHeight;
    }

    private resize(): void {
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = 320 * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = '320px';

        this.ctx.scale(dpr, dpr);
        this.render();
    }

    private bindEvents(): void {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
        this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));

        // Keyboard events
        this.canvas.addEventListener('keydown', this.onKeyDown.bind(this));

        // Scroll
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.shiftKey) {
                // Horizontal scroll
                this.scrollLeft += e.deltaY;
                this.scrollLeft = Math.max(0, this.scrollLeft);
            } else {
                // Vertical scroll
                this.scrollTop += e.deltaY;
                this.scrollTop = Math.max(0, Math.min(
                    this.scrollTop,
                    (this.maxNote - this.minNote) * this.noteHeight - 200
                ));
            }
            this.render();
        });

        // Focus on click
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });

        window.addEventListener('resize', () => this.resize());
    }

    private getGridPosition(e: MouseEvent): { step: number; note: number; x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const step = Math.floor((x - this.pianoWidth + this.scrollLeft) / this.stepWidth);
        const note = this.maxNote - Math.floor((y - this.headerHeight + this.scrollTop) / this.noteHeight);

        return { step, note, x, y };
    }

    private findNoteAt(step: number, note: number): NoteData | null {
        // Check if there's a note at this position
        // Notes can span multiple steps due to gate length
        const steps = this.sequencer.getSteps();

        for (let i = 0; i <= step; i++) {
            const s = steps[i];
            if (s && s.note === note) {
                const noteEndStep = i + Math.ceil(s.gate);
                if (step >= i && step < noteEndStep) {
                    return { step: i, note: s.note, velocity: s.velocity, gate: s.gate };
                }
            }
        }

        // Exact match for single step notes
        const exactStep = steps[step];
        if (exactStep && exactStep.note === note) {
            return { step, note: exactStep.note, velocity: exactStep.velocity, gate: exactStep.gate };
        }

        return null;
    }

    private isNearRightEdge(x: number, noteStep: number, noteGate: number): boolean {
        const noteX = this.pianoWidth + noteStep * this.stepWidth - this.scrollLeft;
        const noteWidth = this.stepWidth * noteGate;
        const edgeX = noteX + noteWidth;
        return Math.abs(x - edgeX) < 8;
    }

    private onMouseDown(e: MouseEvent): void {
        const { step, note, x, y } = this.getGridPosition(e);

        if (x <= this.pianoWidth || y <= this.headerHeight) return;
        if (step < 0 || step >= this.sequencer.getLength()) return;
        if (note < this.minNote || note > this.maxNote) return;

        // Check double-click timing
        const now = Date.now();
        const isDoubleClick = (now - this.lastClickTime) < 300;
        this.lastClickTime = now;

        const existingNote = this.findNoteAt(step, note);

        if (existingNote) {
            // Select the note
            this.selectedNote = { step: existingNote.step, note: existingNote.note };
            this.canvas.focus();

            // Check if near right edge for duration editing
            if (this.isNearRightEdge(x, existingNote.step, existingNote.gate)) {
                this.editMode = 'duration';
                this.dragStartX = x;
                this.dragStartValue = existingNote.gate;
            } else {
                // Otherwise, move mode (drag to new position)
                this.editMode = 'move';
                this.dragStartX = x;
                this.dragStartY = y;
                this.dragStartStep = existingNote.step;
                this.dragStartNote = existingNote.note;
                this.dragStartValue = existingNote.velocity;
            }

            this.isDragging = true;
        } else if (!isDoubleClick) {
            // Deselect when clicking empty space (but not on double-click)
            this.selectedNote = null;
        }

        this.render();
    }

    private onMouseMove(e: MouseEvent): void {
        const { step, note, x, y } = this.getGridPosition(e);

        // Update hover state
        const existingNote = this.findNoteAt(step, note);
        if (existingNote) {
            this.hoveredNote = { step: existingNote.step, note: existingNote.note };

            // Change cursor based on position
            if (this.isNearRightEdge(x, existingNote.step, existingNote.gate)) {
                this.canvas.style.cursor = 'ew-resize';
            } else {
                this.canvas.style.cursor = 'pointer';
            }
        } else {
            this.hoveredNote = null;
            this.canvas.style.cursor = 'crosshair';
        }

        // Handle dragging
        if (this.isDragging && this.selectedNote) {
            const stepData = this.sequencer.getStep(this.selectedNote.step);
            if (!stepData) return;

            if (this.editMode === 'duration') {
                // Adjust gate length
                const deltaX = x - this.dragStartX;
                const deltaSteps = deltaX / this.stepWidth;
                let newGate = Math.max(0.1, this.dragStartValue + deltaSteps);
                newGate = Math.min(newGate, 32); // Max 32 steps (8 bars)
                newGate = Math.round(newGate * 10) / 10; // Round to 0.1

                this.sequencer.setStep(this.selectedNote.step, { gate: newGate });
                this.render();

                if (this.onNoteChange) {
                    this.onNoteChange(this.selectedNote.step, this.selectedNote.note, { gate: newGate });
                }
            } else if (this.editMode === 'move') {
                // Move note to new position
                const newStep = Math.max(0, Math.min(this.sequencer.getLength() - 1, step));
                const newNote = Math.max(this.minNote, Math.min(this.maxNote, note));

                // Only move if position actually changed
                if (newStep !== this.selectedNote.step || newNote !== stepData.note) {
                    // Save old note data
                    const oldData = { ...stepData };

                    // Clear old position
                    this.sequencer.setStep(this.selectedNote.step, { note: -1 });

                    // Set new position
                    this.sequencer.setStep(newStep, {
                        note: newNote,
                        velocity: oldData.velocity,
                        gate: oldData.gate
                    });

                    // Update selection
                    this.selectedNote = { step: newStep, note: newNote };
                    this.render();

                    if (this.onNoteChange) {
                        this.onNoteChange(newStep, newNote, {});
                    }
                }
            }
        }

        // Render for hover effect
        if (!this.isDragging) {
            this.render();
        }
    }

    private onMouseUp(): void {
        this.isDragging = false;
        this.editMode = 'none';
    }

    private onMouseLeave(): void {
        this.hoveredNote = null;
        this.isDragging = false;
        this.editMode = 'none';
        this.render();
    }

    private onDoubleClick(e: MouseEvent): void {
        const { step, note, x, y } = this.getGridPosition(e);

        if (x <= this.pianoWidth || y <= this.headerHeight) return;
        if (step < 0 || step >= this.sequencer.getLength()) return;
        if (note < this.minNote || note > this.maxNote) return;

        const existingNote = this.findNoteAt(step, note);

        if (existingNote) {
            // Double-click on existing note = delete it
            this.sequencer.setStep(existingNote.step, { note: -1 });
            this.selectedNote = null;
        } else {
            // Double-click on empty = create note
            this.sequencer.setStep(step, { note, velocity: 100, gate: 1.0 });
            this.selectedNote = { step, note };
        }

        this.canvas.focus();
        this.render();

        if (this.onNoteChange) {
            this.onNoteChange(step, note, {});
        }
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (!this.selectedNote) return;

        const stepData = this.sequencer.getStep(this.selectedNote.step);
        if (!stepData) return;

        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                // Delete selected note
                e.preventDefault();
                this.sequencer.setStep(this.selectedNote.step, { note: -1 });
                this.selectedNote = null;
                this.render();
                break;

            case 'ArrowLeft':
                // Decrease gate length
                e.preventDefault();
                const newGateL = Math.max(0.1, stepData.gate - 0.1);
                this.sequencer.setStep(this.selectedNote.step, { gate: newGateL });
                this.render();
                break;

            case 'ArrowRight':
                // Increase gate length
                e.preventDefault();
                const newGateR = Math.min(32, stepData.gate + 0.1);
                this.sequencer.setStep(this.selectedNote.step, { gate: newGateR });
                this.render();
                break;

            case 'ArrowUp':
                // Increase velocity
                e.preventDefault();
                const newVelUp = Math.min(127, stepData.velocity + 5);
                this.sequencer.setStep(this.selectedNote.step, { velocity: newVelUp });
                this.render();
                break;

            case 'ArrowDown':
                // Decrease velocity
                e.preventDefault();
                const newVelDown = Math.max(1, stepData.velocity - 5);
                this.sequencer.setStep(this.selectedNote.step, { velocity: newVelDown });
                this.render();
                break;
        }
    }

    private isBlackKey(note: number): boolean {
        const n = note % 12;
        return [1, 3, 6, 8, 10].includes(n);
    }

    private getNoteName(note: number): string {
        const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(note / 12) - 1;
        const name = names[note % 12];
        return name + octave;
    }

    private velocityToColor(velocity: number): string {
        // Interpolate between low and high velocity colors
        const t = velocity / 127;
        const lowR = 128, lowG = 64, lowB = 32;
        const highR = 224, highG = 96, highB = 64;
        const r = Math.round(lowR + (highR - lowR) * t);
        const g = Math.round(lowG + (highG - lowG) * t);
        const b = Math.round(lowB + (highB - lowB) * t);
        return `rgb(${r}, ${g}, ${b})`;
    }

    render(): void {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        // Clear
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, width, height);

        // Draw header (beat numbers)
        this.ctx.fillStyle = this.colors.header;
        this.ctx.fillRect(0, 0, width, this.headerHeight);

        this.ctx.fillStyle = this.colors.headerText;
        this.ctx.font = '10px Inter, sans-serif';
        this.ctx.textAlign = 'center';

        const steps = this.sequencer.getLength();
        for (let i = 0; i < steps; i++) {
            const x = this.pianoWidth + i * this.stepWidth - this.scrollLeft;
            if (x > this.pianoWidth - this.stepWidth && x < width) {
                // Beat numbers (every 4 steps)
                if (i % 4 === 0) {
                    this.ctx.fillText(String(i / 4 + 1), x + this.stepWidth * 2, 16);
                }
            }
        }

        // Draw piano keys and grid rows
        for (let note = this.maxNote; note >= this.minNote; note--) {
            const y = this.headerHeight + (this.maxNote - note) * this.noteHeight - this.scrollTop;

            if (y < this.headerHeight - this.noteHeight || y > height) continue;

            const isBlack = this.isBlackKey(note);

            // Key background
            this.ctx.fillStyle = isBlack ? this.colors.pianoBlack : this.colors.pianoWhite;
            this.ctx.fillRect(0, y, this.pianoWidth - 2, this.noteHeight - 1);

            // Key label (only C notes)
            if (note % 12 === 0) {
                this.ctx.fillStyle = isBlack ? '#aaa' : '#333';
                this.ctx.font = '9px Inter, sans-serif';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(this.getNoteName(note), 4, y + this.noteHeight - 3);
            }

            // Grid row background
            this.ctx.fillStyle = isBlack ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.02)';
            this.ctx.fillRect(this.pianoWidth, y, width - this.pianoWidth, this.noteHeight);

            // Grid horizontal line
            this.ctx.strokeStyle = this.colors.gridLine;
            this.ctx.beginPath();
            this.ctx.moveTo(this.pianoWidth, y + this.noteHeight);
            this.ctx.lineTo(width, y + this.noteHeight);
            this.ctx.stroke();
        }

        // Draw vertical grid lines and notes
        const stepData = this.sequencer.getSteps();

        for (let i = 0; i <= steps; i++) {
            const x = this.pianoWidth + i * this.stepWidth - this.scrollLeft;

            if (x < this.pianoWidth - this.stepWidth || x > width + this.stepWidth) continue;

            // Vertical grid line
            this.ctx.strokeStyle = i % 4 === 0 ? this.colors.gridLineAccent : this.colors.gridLine;
            this.ctx.lineWidth = i % 4 === 0 ? 1.5 : 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.headerHeight);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
            this.ctx.lineWidth = 1;

            // Draw note if present
            if (i < steps && stepData[i].note >= 0) {
                const note = stepData[i].note;
                const velocity = stepData[i].velocity;
                const gate = stepData[i].gate;
                const y = this.headerHeight + (this.maxNote - note) * this.noteHeight - this.scrollTop;

                if (y >= this.headerHeight - this.noteHeight && y < height) {
                    const isSelected = this.selectedNote?.step === i && this.selectedNote?.note === note;
                    const isHovered = this.hoveredNote?.step === i && this.hoveredNote?.note === note;

                    // Note rectangle with velocity-based color
                    if (isSelected) {
                        this.ctx.fillStyle = this.colors.noteSelected;
                    } else if (isHovered) {
                        this.ctx.fillStyle = this.colors.noteHover;
                    } else {
                        this.ctx.fillStyle = this.velocityToColor(velocity);
                    }

                    const noteWidth = this.stepWidth * gate - 2;
                    const noteX = x + 1;
                    const noteY = y + 1;
                    const noteH = this.noteHeight - 2;

                    this.ctx.fillRect(noteX, noteY, noteWidth, noteH);

                    // Note border
                    this.ctx.strokeStyle = isSelected ? '#ffcc00' : 'rgba(255,255,255,0.3)';
                    this.ctx.lineWidth = isSelected ? 2 : 1;
                    this.ctx.strokeRect(noteX, noteY, noteWidth, noteH);
                    this.ctx.lineWidth = 1;

                    // Resize handle (right edge)
                    if (isSelected || isHovered) {
                        this.ctx.fillStyle = this.colors.resizeHandle;
                        this.ctx.fillRect(noteX + noteWidth - 4, noteY, 4, noteH);
                    }

                    // Velocity indicator (small bar at bottom)
                    const velHeight = 3;
                    const velWidth = (noteWidth - 4) * (velocity / 127);
                    this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    this.ctx.fillRect(noteX + 2, noteY + noteH - velHeight - 1, velWidth, velHeight);

                    // Velocity text
                    if (noteWidth > 20) {
                        this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
                        this.ctx.font = '8px Inter, sans-serif';
                        this.ctx.textAlign = 'left';
                        this.ctx.fillText(String(velocity), noteX + 3, noteY + 10);
                    }
                }
            }
        }

        // Draw playhead
        if (this.sequencer.getIsPlaying()) {
            const currentStep = this.sequencer.getCurrentStep();
            const x = this.pianoWidth + currentStep * this.stepWidth - this.scrollLeft;

            this.ctx.strokeStyle = this.colors.playhead;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.headerHeight);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
            this.ctx.lineWidth = 1;
        }

        // Draw piano area border and label
        this.ctx.fillStyle = this.colors.header;
        this.ctx.fillRect(0, 0, this.pianoWidth, this.headerHeight);

        this.ctx.fillStyle = this.colors.headerText;
        this.ctx.font = '9px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Piano', this.pianoWidth / 2, 16);

        // Draw info for selected note
        if (this.selectedNote) {
            const stepInfo = this.sequencer.getStep(this.selectedNote.step);
            if (stepInfo && stepInfo.note >= 0) {
                const infoText = `${this.getNoteName(stepInfo.note)} | Vel: ${stepInfo.velocity} | Gate: ${stepInfo.gate.toFixed(1)}`;
                this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
                this.ctx.fillRect(width - 180, 4, 175, 18);
                this.ctx.fillStyle = '#4ade80';
                this.ctx.font = '10px Inter, sans-serif';
                this.ctx.textAlign = 'right';
                this.ctx.fillText(infoText, width - 8, 16);
            }
        }
    }

    setOnNoteChange(callback: (step: number, note: number, data: Partial<Step>) => void): void {
        this.onNoteChange = callback;
    }

    update(): void {
        this.render();
    }
}

// CSS for piano roll
export const pianoRollStyles = `
.piano-roll-wrapper {
  background: #1a1e24;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #2a3038;
}

.piano-roll-canvas {
  display: block;
  outline: none;
}

.piano-roll-canvas:focus {
  box-shadow: inset 0 0 0 2px rgba(74, 144, 184, 0.5);
}
`;
