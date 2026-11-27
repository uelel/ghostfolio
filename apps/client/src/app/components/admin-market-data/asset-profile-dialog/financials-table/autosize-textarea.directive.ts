import {
  AfterViewInit,
  Directive,
  DoCheck,
  ElementRef,
  HostListener,
  inject,
  OnDestroy
} from '@angular/core';

/**
 * Grows a textarea to fit its whole content. Unlike CDK's
 * cdkTextareaAutosize, the computed height includes padding and border, so it
 * works with `box-sizing: border-box` (e.g. Bootstrap's .form-control).
 */
@Directive({
  selector: 'textarea[gfAutosizeTextarea]',
  standalone: true
})
export class GfAutosizeTextareaDirective
  implements AfterViewInit, DoCheck, OnDestroy
{
  private readonly elementRef =
    inject<ElementRef<HTMLTextAreaElement>>(ElementRef);
  private lastValue: string | null = null;
  private lastWidth = 0;
  private resizeObserver?: ResizeObserver;

  public ngAfterViewInit() {
    this.resize();

    // Re-measure when the width changes (wrapping depends on it)
    this.resizeObserver = new ResizeObserver(() => {
      const width = this.elementRef.nativeElement.clientWidth;

      if (width !== this.lastWidth) {
        this.lastWidth = width;
        this.resize();
      }
    });
    this.resizeObserver.observe(this.elementRef.nativeElement);
  }

  public ngDoCheck() {
    // Catch programmatic value changes (e.g. [value] binding)
    if (this.elementRef.nativeElement.value !== this.lastValue) {
      this.resize();
    }
  }

  public ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  @HostListener('input')
  public resize() {
    const textarea = this.elementRef.nativeElement;
    const { borderBottomWidth, borderTopWidth } = getComputedStyle(textarea);

    this.lastValue = textarea.value;
    textarea.style.height = 'auto';
    textarea.style.height = `${
      textarea.scrollHeight +
      parseFloat(borderTopWidth) +
      parseFloat(borderBottomWidth)
    }px`;
  }
}
