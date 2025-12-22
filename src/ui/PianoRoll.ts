/**
 * Piano Roll Editor - Polyphonic Version
 * Logic Pro style MIDI editor with:
 * - Multiple notes per step (chords)
 * - Note selection
 * - Duration editing (left/right drag)
 * - Velocity editing (up/down drag while holding)
 * - Delete key to remove notes
 * - Double-click to create/delete notes
 * - Horizontal scrollbar for long sequences
 * - Resizable height
 */

import { Sequencer, NoteEvent } from '../sequencer/Sequencer';

interface SelectedNote {
    step: number;
    note: number;
}

type EditMode = 'none' | 'select' | 'duration' | 'velocity' | 'move' | 'draw';

export class PianoRoll {
    private container: HTMLElement;
    private sequencer: Sequencer;
    private wrapper: HTMLElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private hScrollbar: HTMLElement;
    private hScrollThumb: HTMLElement;
    private resizeHandle: HTMLElement;

    // Piano roll dimensions
    private pianoWidth: number = 60;
    private noteHeight: number = 14;
    private stepWidth: number = 32;
    private headerHeight: number = 26;
    private scrollbarHeight: number = 14;
    private canvasHeight: number = 320;
    private minHeight: number = 200;
    private maxHeight: number = 600;

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
    private isResizing: boolean = false;
    private resizeStartY: number = 0;
    private resizeStartHeight: number = 0;
    private isScrollbarDragging: boolean = false;
    private scrollbarDragStartX: number = 0;
    private scrollbarDragStartScroll: number = 0;

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
        resizeHandle: '#ffcc00',
        scrollbar: '#2a3038',
        scrollThumb: '#4a5568'
    };

    private onNoteChange: ((step: number, note: number, data: Partial<NoteEvent>) => void) | null = null;

    constructor(container: HTMLElement, sequencer: Sequencer) {
        this.container = container;
        this.sequencer = sequencer;

        // Create wrapper with scrollbar
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'piano-roll-wrapper';

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'piano-roll-canvas';
        this.canvas.tabIndex = 0;
        this.ctx = this.canvas.getContext('2d')!;

        // Create horizontal scrollbar
        this.hScrollbar = document.createElement('div');
        this.hScrollbar.className = 'piano-roll-hscrollbar';
        this.hScrollThumb = document.createElement('div');
        this.hScrollThumb.className = 'piano-roll-hscroll-thumb';
        this.hScrollbar.appendChild(this.hScrollThumb);

        // Create resize handle
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.className = 'piano-roll-resize-handle';

        this.wrapper.appendChild(this.canvas);
        this.wrapper.appendChild(this.hScrollbar);
        this.wrapper.appendChild(this.resizeHandle);

        container.innerHTML = '';
        container.appendChild(this.wrapper);

        this.resize();
        this.bindEvents();
        this.render();
        this.updateScrollbar();

        // Initial scroll to middle octave
        this.scrollTop = (this.maxNote - 64) * this.noteHeight;
    }

    private resize(): void {
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = this.canvasHeight * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = this.canvasHeight + 'px';

        this.ctx.scale(dpr, dpr);
        this.render();
        this.updateScrollbar();
    }

    private getMaxScrollLeft(): number {
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const totalWidth = this.sequencer.getLength() * this.stepWidth;
        const visibleWidth = canvasWidth - this.pianoWidth;
        return Math.max(0, totalWidth - visibleWidth);
    }

    private updateScrollbar(): void {
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const totalWidth = this.sequencer.getLength() * this.stepWidth;
        const visibleWidth = canvasWidth - this.pianoWidth;

        if (totalWidth <= visibleWidth) {
            this.hScrollbar.style.display = 'none';
            return;
        }

        this.hScrollbar.style.display = 'block';
        this.hScrollbar.style.left = this.pianoWidth + 'px';
        this.hScrollbar.style.width = (canvasWidth - this.pianoWidth) + 'px';

        const thumbWidth = Math.max(30, (visibleWidth / totalWidth) * (canvasWidth - this.pianoWidth));
        const maxThumbLeft = (canvasWidth - this.pianoWidth) - thumbWidth;
        const maxScrollLeft = this.getMaxScrollLeft();
        const thumbLeft = maxScrollLeft > 0 ? (this.scrollLeft / maxScrollLeft) * maxThumbLeft : 0;

        this.hScrollThumb.style.width = thumbWidth + 'px';
        this.hScrollThumb.style.left = thumbLeft + 'px';
    }

    private bindEvents(): void {
        // Mouse events on canvas
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
        this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));

        // Keyboard events
        this.canvas.addEventListener('keydown', this.onKeyDown.bind(this));

        // Scroll (vertical only on canvas, horizontal via shift or scrollbar)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                // Horizontal scroll
                const delta = e.shiftKey ? e.deltaY : e.deltaX;
                this.scrollLeft += delta;
                this.scrollLeft = Math.max(0, Math.min(this.scrollLeft, this.getMaxScrollLeft()));
                this.updateScrollbar();
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

        // Scrollbar drag
        this.hScrollThumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.isScrollbarDragging = true;
            this.scrollbarDragStartX = e.clientX;
            this.scrollbarDragStartScroll = this.scrollLeft;
        });

        // Click on scrollbar track
        this.hScrollbar.addEventListener('mousedown', (e) => {
            if (e.target === this.hScrollbar) {
                const rect = this.hScrollbar.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const thumbRect = this.hScrollThumb.getBoundingClientRect();
                const thumbCenter = thumbRect.left - rect.left + thumbRect.width / 2;

                if (clickX < thumbCenter) {
                    // Click left of thumb - scroll left
                    this.scrollLeft = Math.max(0, this.scrollLeft - 200);
                } else {
                    // Click right of thumb - scroll right
                    this.scrollLeft = Math.min(this.getMaxScrollLeft(), this.scrollLeft + 200);
                }
                this.updateScrollbar();
                this.render();
            }
        });

        // Resize handle
        this.resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.isResizing = true;
            this.resizeStartY = e.clientY;
            this.resizeStartHeight = this.canvasHeight;
        });

        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => {
            if (this.isScrollbarDragging) {
                const deltaX = e.clientX - this.scrollbarDragStartX;
                const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
                const totalWidth = this.sequencer.getLength() * this.stepWidth;
                const visibleWidth = canvasWidth - this.pianoWidth;
                const scrollRatio = totalWidth / visibleWidth;

                this.scrollLeft = Math.max(0, Math.min(
                    this.getMaxScrollLeft(),
                    this.scrollbarDragStartScroll + deltaX * scrollRatio
                ));
                this.updateScrollbar();
                this.render();
            }

            if (this.isResizing) {
                const deltaY = e.clientY - this.resizeStartY;
                this.canvasHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.resizeStartHeight + deltaY));
                this.resize();
            }
        });

        document.addEventListener('mouseup', () => {
            this.isScrollbarDragging = false;
            this.isResizing = false;
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

    private findNoteAt(step: number, note: number): { step: number; noteEvent: NoteEvent } | null {
        const steps = this.sequencer.getSteps();

        for (let i = 0; i <= step; i++) {
            const stepData = steps[i];
            if (!stepData) continue;

            for (const noteEvent of stepData.notes) {
                if (noteEvent.note === note) {
                    const noteEndStep = i + Math.ceil(noteEvent.gate);
                    if (step >= i && step < noteEndStep) {
                        return { step: i, noteEvent };
                    }
                }
            }
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

        const now = Date.now();
        const isDoubleClick = (now - this.lastClickTime) < 300;
        this.lastClickTime = now;

        const existingNote = this.findNoteAt(step, note);

        if (existingNote) {
            this.selectedNote = { step: existingNote.step, note: existingNote.noteEvent.note };
            this.canvas.focus();

            if (this.isNearRightEdge(x, existingNote.step, existingNote.noteEvent.gate)) {
                this.editMode = 'duration';
                this.dragStartX = x;
                this.dragStartValue = existingNote.noteEvent.gate;
            } else {
                this.editMode = 'move';
                this.dragStartX = x;
                this.dragStartY = y;
                this.dragStartStep = existingNote.step;
                this.dragStartNote = existingNote.noteEvent.note;
                this.dragStartValue = existingNote.noteEvent.velocity;
            }

            this.isDragging = true;
        } else if (!isDoubleClick) {
            this.selectedNote = null;
        }

        this.render();
    }

    private onMouseMove(e: MouseEvent): void {
        const { step, note, x } = this.getGridPosition(e);

        const existingNote = this.findNoteAt(step, note);
        if (existingNote) {
            this.hoveredNote = { step: existingNote.step, note: existingNote.noteEvent.note };

            if (this.isNearRightEdge(x, existingNote.step, existingNote.noteEvent.gate)) {
                this.canvas.style.cursor = 'ew-resize';
            } else {
                this.canvas.style.cursor = 'pointer';
            }
        } else {
            this.hoveredNote = null;
            this.canvas.style.cursor = 'crosshair';
        }

        if (this.isDragging && this.selectedNote) {
            const noteEvent = this.sequencer.getNote(this.selectedNote.step, this.selectedNote.note);
            if (!noteEvent) return;

            if (this.editMode === 'duration') {
                const deltaX = x - this.dragStartX;
                const deltaSteps = deltaX / this.stepWidth;
                let newGate = Math.max(0.1, this.dragStartValue + deltaSteps);
                newGate = Math.min(newGate, 32);
                newGate = Math.round(newGate * 10) / 10;

                this.sequencer.updateNote(this.selectedNote.step, this.selectedNote.note, { gate: newGate });
                this.render();

                if (this.onNoteChange) {
                    this.onNoteChange(this.selectedNote.step, this.selectedNote.note, { gate: newGate });
                }
            } else if (this.editMode === 'move') {
                const newStep = Math.max(0, Math.min(this.sequencer.getLength() - 1, step));
                const newNote = Math.max(this.minNote, Math.min(this.maxNote, note));

                if (newStep !== this.selectedNote.step || newNote !== noteEvent.note) {
                    const oldData = { ...noteEvent };

                    this.sequencer.removeNote(this.selectedNote.step, this.selectedNote.note);
                    this.sequencer.addNote(newStep, newNote, oldData.velocity, oldData.gate);

                    this.selectedNote = { step: newStep, note: newNote };
                    this.render();

                    if (this.onNoteChange) {
                        this.onNoteChange(newStep, newNote, {});
                    }
                }
            }
        }

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
            this.sequencer.removeNote(existingNote.step, existingNote.noteEvent.note);
            this.selectedNote = null;
        } else {
            this.sequencer.addNote(step, note, 100, 1.0);
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

        const noteEvent = this.sequencer.getNote(this.selectedNote.step, this.selectedNote.note);
        if (!noteEvent) return;

        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                this.sequencer.removeNote(this.selectedNote.step, this.selectedNote.note);
                this.selectedNote = null;
                this.render();
                break;

            case 'ArrowLeft':
                e.preventDefault();
                const newGateL = Math.max(0.1, noteEvent.gate - 0.1);
                this.sequencer.updateNote(this.selectedNote.step, this.selectedNote.note, { gate: newGateL });
                this.render();
                break;

            case 'ArrowRight':
                e.preventDefault();
                const newGateR = Math.min(32, noteEvent.gate + 0.1);
                this.sequencer.updateNote(this.selectedNote.step, this.selectedNote.note, { gate: newGateR });
                this.render();
                break;

            case 'ArrowUp':
                e.preventDefault();
                const newVelUp = Math.min(127, noteEvent.velocity + 5);
                this.sequencer.updateNote(this.selectedNote.step, this.selectedNote.note, { velocity: newVelUp });
                this.render();
                break;

            case 'ArrowDown':
                e.preventDefault();
                const newVelDown = Math.max(1, noteEvent.velocity - 5);
                this.sequencer.updateNote(this.selectedNote.step, this.selectedNote.note, { velocity: newVelDown });
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

            this.ctx.fillStyle = isBlack ? this.colors.pianoBlack : this.colors.pianoWhite;
            this.ctx.fillRect(0, y, this.pianoWidth - 2, this.noteHeight - 1);

            if (note % 12 === 0) {
                this.ctx.fillStyle = isBlack ? '#aaa' : '#333';
                this.ctx.font = '9px Inter, sans-serif';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(this.getNoteName(note), 4, y + this.noteHeight - 3);
            }

            this.ctx.fillStyle = isBlack ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.02)';
            this.ctx.fillRect(this.pianoWidth, y, width - this.pianoWidth, this.noteHeight);

            this.ctx.strokeStyle = this.colors.gridLine;
            this.ctx.beginPath();
            this.ctx.moveTo(this.pianoWidth, y + this.noteHeight);
            this.ctx.lineTo(width, y + this.noteHeight);
            this.ctx.stroke();
        }

        // Draw vertical grid lines
        for (let i = 0; i <= steps; i++) {
            const x = this.pianoWidth + i * this.stepWidth - this.scrollLeft;

            if (x < this.pianoWidth - this.stepWidth || x > width + this.stepWidth) continue;

            this.ctx.strokeStyle = i % 4 === 0 ? this.colors.gridLineAccent : this.colors.gridLine;
            this.ctx.lineWidth = i % 4 === 0 ? 1.5 : 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.headerHeight);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
            this.ctx.lineWidth = 1;
        }

        // Draw all notes
        const stepData = this.sequencer.getSteps();
        for (let i = 0; i < steps; i++) {
            const step = stepData[i];
            if (!step) continue;

            for (const noteEvent of step.notes) {
                const note = noteEvent.note;
                const velocity = noteEvent.velocity;
                const gate = noteEvent.gate;

                const x = this.pianoWidth + i * this.stepWidth - this.scrollLeft;
                const y = this.headerHeight + (this.maxNote - note) * this.noteHeight - this.scrollTop;

                if (x < this.pianoWidth - this.stepWidth * gate || x > width + this.stepWidth) continue;
                if (y < this.headerHeight - this.noteHeight || y > height) continue;

                const isSelected = this.selectedNote?.step === i && this.selectedNote?.note === note;
                const isHovered = this.hoveredNote?.step === i && this.hoveredNote?.note === note;

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

                this.ctx.strokeStyle = isSelected ? '#ffcc00' : 'rgba(255,255,255,0.3)';
                this.ctx.lineWidth = isSelected ? 2 : 1;
                this.ctx.strokeRect(noteX, noteY, noteWidth, noteH);
                this.ctx.lineWidth = 1;

                if (isSelected || isHovered) {
                    this.ctx.fillStyle = this.colors.resizeHandle;
                    this.ctx.fillRect(noteX + noteWidth - 4, noteY, 4, noteH);
                }

                const velHeight = 3;
                const velWidth = (noteWidth - 4) * (velocity / 127);
                this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
                this.ctx.fillRect(noteX + 2, noteY + noteH - velHeight - 1, velWidth, velHeight);

                if (noteWidth > 20) {
                    this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
                    this.ctx.font = '8px Inter, sans-serif';
                    this.ctx.textAlign = 'left';
                    this.ctx.fillText(String(velocity), noteX + 3, noteY + 10);
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
            const noteEvent = this.sequencer.getNote(this.selectedNote.step, this.selectedNote.note);
            if (noteEvent) {
                const infoText = `${this.getNoteName(noteEvent.note)} | Vel: ${noteEvent.velocity} | Gate: ${noteEvent.gate.toFixed(1)}`;
                this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
                this.ctx.fillRect(width - 180, 4, 175, 18);
                this.ctx.fillStyle = '#4ade80';
                this.ctx.font = '10px Inter, sans-serif';
                this.ctx.textAlign = 'right';
                this.ctx.fillText(infoText, width - 8, 16);
            }
        }

        // Draw scroll position indicator
        const scrollInfo = `Bar ${Math.floor(this.scrollLeft / (this.stepWidth * 4)) + 1}`;
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(this.pianoWidth + 5, 4, 50, 18);
        this.ctx.fillStyle = '#888';
        this.ctx.font = '9px Inter, sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(scrollInfo, this.pianoWidth + 10, 16);
    }

    setOnNoteChange(callback: (step: number, note: number, data: Partial<NoteEvent>) => void): void {
        this.onNoteChange = callback;
    }

    update(): void {
        this.render();
    }

    /**
     * Set the height of the piano roll
     */
    setHeight(height: number): void {
        this.canvasHeight = Math.max(this.minHeight, Math.min(this.maxHeight, height));
        this.resize();
    }

    /**
     * Scroll to a specific step
     */
    scrollToStep(step: number): void {
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const targetX = step * this.stepWidth;
        const visibleWidth = canvasWidth - this.pianoWidth;

        if (targetX < this.scrollLeft) {
            this.scrollLeft = targetX;
        } else if (targetX > this.scrollLeft + visibleWidth - this.stepWidth) {
            this.scrollLeft = targetX - visibleWidth + this.stepWidth;
        }

        this.scrollLeft = Math.max(0, Math.min(this.scrollLeft, this.getMaxScrollLeft()));
        this.updateScrollbar();
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
  position: relative;
}

.piano-roll-canvas {
  display: block;
  outline: none;
}

.piano-roll-canvas:focus {
  box-shadow: inset 0 0 0 2px rgba(74, 144, 184, 0.5);
}

.piano-roll-hscrollbar {
  position: absolute;
  bottom: 20px;
  height: 12px;
  background: #1a1e24;
  border-top: 1px solid #2a3038;
}

.piano-roll-hscroll-thumb {
  position: absolute;
  height: 10px;
  top: 1px;
  background: #4a5568;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.15s;
}

.piano-roll-hscroll-thumb:hover {
  background: #5a6578;
}

.piano-roll-resize-handle {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  background: linear-gradient(to bottom, transparent, #2a3038);
  cursor: ns-resize;
}

.piano-roll-resize-handle:hover {
  background: linear-gradient(to bottom, transparent, #4a90b8);
}
`;
