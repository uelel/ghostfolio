import { TextFieldModule } from '@angular/cdk/text-field';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
  viewChildren
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline } from 'ionicons/icons';

/**
 * Edits a newline-separated string as a list of bullet points.
 * New items are typed into the add row at the bottom of the list and
 * confirmed with Enter. The form value stays a plain string (one item per
 * line, empty items dropped), so it is compatible with a regular textarea.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, TextFieldModule],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GfBulletListInputComponent)
    }
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-bullet-list-input',
  styleUrls: ['./bullet-list-input.component.scss'],
  templateUrl: './bullet-list-input.component.html'
})
export class GfBulletListInputComponent implements ControlValueAccessor {
  public readonly maxLength = input<number>();
  public readonly placeholder = input<string>('');

  protected readonly draft = signal('');
  protected readonly isDisabled = signal(false);
  protected readonly items = signal<string[]>([]);
  protected readonly totalLength = computed(() => {
    return GfBulletListInputComponent.serialize(this.items()).length;
  });

  private readonly addTextarea =
    viewChild<ElementRef<HTMLTextAreaElement>>('addTextarea');
  private readonly injector = inject(Injector);
  private readonly itemTextareas =
    viewChildren<ElementRef<HTMLTextAreaElement>>('itemTextarea');

  public constructor() {
    addIcons({ addOutline, closeOutline });
  }

  public static parse(value: string | null | undefined): string[] {
    return GfBulletListInputComponent.toLines(value ?? '');
  }

  public static serialize(items: string[]): string {
    return items
      .map((item) => item.trim())
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Splits text into trimmed, non-empty lines and strips common bullet
   * markers (e.g. from a pasted list).
   */
  public static toLines(text: string): string[] {
    return text
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => {
        return line.replace(/^\s*(?:[-*•–·]|\d+[.)])\s+/, '').trim();
      })
      .filter(Boolean);
  }

  public registerOnChange(fn: (value: string) => void) {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean) {
    this.isDisabled.set(isDisabled);
  }

  public writeValue(value: string | null) {
    this.draft.set('');
    this.items.set(GfBulletListInputComponent.parse(value));
  }

  protected getAddMaxLength() {
    const maxLength = this.maxLength();

    if (maxLength === undefined) {
      return null;
    }

    const separatorLength = this.items().length > 0 ? 1 : 0;

    return Math.max(
      this.draft().length,
      maxLength - this.totalLength() - separatorLength
    );
  }

  protected getItemMaxLength(index: number) {
    const maxLength = this.maxLength();

    if (maxLength === undefined) {
      return null;
    }

    const item = this.items()[index];

    return Math.max(item.length, maxLength - this.totalLength() + item.length);
  }

  protected onAddBlur() {
    // Keep typed text when the user leaves the field (e.g. clicks Save)
    // without pressing Enter
    this.commitDraft();
    this.onTouched();
  }

  protected onAddInput(event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;

    // Line breaks can still come in through e.g. drag and drop
    if (value.includes('\n')) {
      this.draft.set(value);
      this.commitDraft();
      return;
    }

    this.draft.set(value);
  }

  protected onAddKeydown(event: KeyboardEvent) {
    const textarea = event.target as HTMLTextAreaElement;
    const lastIndex = this.items().length - 1;

    switch (event.key) {
      case 'Enter': {
        event.preventDefault();
        this.commitDraft();
        break;
      }

      case 'Backspace':
      case 'ArrowUp': {
        if (
          lastIndex < 0 ||
          textarea.selectionStart !== 0 ||
          textarea.selectionEnd !== 0 ||
          (event.key === 'Backspace' && textarea.value !== '')
        ) {
          return;
        }

        event.preventDefault();
        this.focusItem(lastIndex, this.items()[lastIndex].length);
        break;
      }
    }
  }

  protected onAddPaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text/plain') ?? '';

    if (!text.includes('\n')) {
      return;
    }

    event.preventDefault();

    const { selectionEnd, selectionStart, value } =
      event.target as HTMLTextAreaElement;

    this.draft.set(
      value.slice(0, selectionStart) + text + value.slice(selectionEnd)
    );
    this.commitDraft();
  }

  protected onDeleteItem(index: number) {
    this.update(this.items().filter((_, i) => i !== index));
  }

  protected onItemBlur(index: number) {
    if (this.items()[index]?.trim() === '') {
      this.onDeleteItem(index);
    }

    this.onTouched();
  }

  protected onItemInput(index: number, event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;

    // Line breaks can still come in through e.g. drag and drop
    if (value.includes('\n')) {
      this.replaceItem(index, GfBulletListInputComponent.toLines(value));
      return;
    }

    const items = [...this.items()];
    items[index] = value;
    this.update(items);
  }

  protected onItemKeydown(index: number, event: KeyboardEvent) {
    const textarea = event.target as HTMLTextAreaElement;
    const { selectionEnd, selectionStart, value } = textarea;
    const isLast = index === this.items().length - 1;

    switch (event.key) {
      case 'Enter': {
        // Confirm the edit and continue in the add row
        event.preventDefault();
        this.focusAdd();
        break;
      }

      case 'Backspace': {
        if (value !== '') {
          return;
        }

        event.preventDefault();
        this.onDeleteItem(index);

        if (index > 0) {
          this.focusItem(index - 1, this.items()[index - 1].length);
        } else {
          this.focusAdd();
        }
        break;
      }

      case 'ArrowUp': {
        if (index === 0 || selectionStart !== 0 || selectionEnd !== 0) {
          return;
        }

        event.preventDefault();
        this.focusItem(index - 1, this.items()[index - 1].length);
        break;
      }

      case 'ArrowDown': {
        if (selectionStart !== value.length || selectionEnd !== value.length) {
          return;
        }

        event.preventDefault();

        if (isLast) {
          this.focusAdd();
        } else {
          this.focusItem(index + 1, 0);
        }
        break;
      }
    }
  }

  protected onItemPaste(index: number, event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text/plain') ?? '';

    if (!text.includes('\n')) {
      return;
    }

    event.preventDefault();

    const { selectionEnd, selectionStart, value } =
      event.target as HTMLTextAreaElement;

    this.replaceItem(
      index,
      GfBulletListInputComponent.toLines(
        value.slice(0, selectionStart) + text + value.slice(selectionEnd)
      )
    );
  }

  private commitDraft() {
    const lines = GfBulletListInputComponent.toLines(this.draft());

    this.draft.set('');

    const addTextarea = this.addTextarea()?.nativeElement;

    if (addTextarea) {
      // The [value] binding does not change when the draft was already
      // empty (e.g. only whitespace was typed), so clear the DOM directly
      addTextarea.value = '';
    }

    if (lines.length > 0) {
      this.update([...this.items(), ...lines]);
    }
  }

  private focusAdd() {
    afterNextRender(
      () => {
        this.addTextarea()?.nativeElement.focus();
      },
      { injector: this.injector }
    );
  }

  private focusItem(index: number, caret: number) {
    afterNextRender(
      () => {
        const textarea = this.itemTextareas()[index]?.nativeElement;

        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(caret, caret);
        }
      },
      { injector: this.injector }
    );
  }

  private replaceItem(index: number, lines: string[]) {
    const items = [...this.items()];
    items.splice(index, 1, ...lines);
    this.update(items);

    if (lines.length > 0) {
      const lastIndex = index + lines.length - 1;
      this.focusItem(lastIndex, items[lastIndex].length);
    }
  }

  private update(items: string[]) {
    this.items.set(items);
    this.onChange(GfBulletListInputComponent.serialize(items));
  }

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
}
