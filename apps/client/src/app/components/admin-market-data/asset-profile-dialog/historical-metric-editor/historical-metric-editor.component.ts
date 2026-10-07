import { parseFundamentalCsv } from '@ghostfolio/common/helper';
import { HistoricalMetricPoint } from '@ghostfolio/common/interfaces';
import { ColorScheme } from '@ghostfolio/common/types';

import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormArray,
  FormControl,
  FormGroup,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatExpansionModule,
  MatExpansionPanel
} from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { IonIcon } from '@ionic/angular/standalone';
import {
  CategoryScale,
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline } from 'ionicons/icons';

type MetricRowGroup = FormGroup<{
  dateDisplay: FormControl<string | null>;
  value: FormControl<number | null>;
}>;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonIcon,
    MatButtonModule,
    MatExpansionModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GfHistoricalMetricEditorComponent)
    }
  ],
  selector: 'gf-historical-metric-editor',
  styleUrls: ['./historical-metric-editor.component.scss'],
  templateUrl: './historical-metric-editor.component.html'
})
export class GfHistoricalMetricEditorComponent
  implements AfterViewInit, ControlValueAccessor, OnDestroy, OnInit
{
  @Input() colorScheme: ColorScheme;
  @Input() currency: string;
  @Input() label: string;
  @Input() locale: string;
  @Input() unit: 'currency' | 'percent' = 'currency';
  @Input() yAxisLabel = '';

  @ViewChild('chartCanvas') chartCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild(MatExpansionPanel) private panel?: MatExpansionPanel;

  protected chartItems: HistoricalMetricPoint[] = [];
  protected disabled = false;
  protected readonly rows = new FormArray<MetricRowGroup>([]);

  private chart: Chart<'line'> | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostElementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private onChange: (value: HistoricalMetricPoint[]) => void = () => {
    // ControlValueAccessor onChange callback
  };
  private onTouched: () => void = () => {
    // ControlValueAccessor onTouched callback
  };

  public constructor(private changeDetectorRef: ChangeDetectorRef) {
    addIcons({ addOutline, trashOutline });

    Chart.register(
      CategoryScale,
      LinearScale,
      LineController,
      LineElement,
      PointElement,
      Title,
      Tooltip
    );
  }

  public ngOnInit() {
    this.rows.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emit());
  }

  public ngAfterViewInit() {
    this.renderChart();
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  public writeValue(value: HistoricalMetricPoint[] | null): void {
    const points = Array.isArray(value) ? value : [];

    this.rows.clear({ emitEvent: false });

    for (const point of points) {
      this.rows.push(this.buildRow(point), { emitEvent: false });
    }

    this.recomputeChartItems();
    this.renderChart();
    this.changeDetectorRef.markForCheck();
  }

  public registerOnChange(fn: (value: HistoricalMetricPoint[]) => void): void {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: Event): void {
    const target = event.target as Node | null;

    if (!target || !this.hostElementRef.nativeElement.contains(target)) {
      this.panel?.close();
    }
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;

    if (isDisabled) {
      this.rows.disable({ emitEvent: false });
    } else {
      this.rows.enable({ emitEvent: false });
    }

    this.changeDetectorRef.markForCheck();
  }

  protected onAddRow(): void {
    this.rows.push(this.buildRow({ date: '', value: null }));
    this.onTouched();
  }

  protected onDeleteRow(index: number): void {
    this.rows.removeAt(index);
    this.onTouched();
  }

  protected onPaste(event: ClipboardEvent, rowIndex: number): void {
    const text = event.clipboardData?.getData('text') ?? '';

    if (!/[\n\t,;]/.test(text) && text.trim().split(/\s+/).length < 2) {
      return;
    }

    const parsed = parseFundamentalCsv(text);

    if (parsed.length === 0) {
      return;
    }

    event.preventDefault();
    this.replaceRowsFrom(rowIndex, parsed);
    this.onTouched();
  }

  private buildRow(point: {
    date: string;
    value: number | null;
  }): MetricRowGroup {
    return new FormGroup({
      dateDisplay: new FormControl<string | null>(
        this.toDisplayDate(point.date)
      ),
      value: new FormControl<number | null>(
        typeof point.value === 'number' ? point.value : null
      )
    });
  }

  private emit(): void {
    this.recomputeChartItems();
    this.renderChart();
    this.onChange(this.chartItems);
    this.changeDetectorRef.markForCheck();
  }

  private formatValue(value: number): string {
    if (this.unit === 'percent') {
      return `${value.toLocaleString(this.locale, {
        maximumFractionDigits: 2
      })}%`;
    }

    const symbol = this.currencySymbol();
    const formatted = value.toLocaleString(this.locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });

    return `${symbol}${formatted}`;
  }

  private currencySymbol(): string {
    if (!this.currency) {
      return '';
    }

    try {
      const parts = new Intl.NumberFormat(this.locale, {
        currency: this.currency,
        style: 'currency'
      }).formatToParts(1);

      return parts.find((p) => p.type === 'currency')?.value ?? '';
    } catch {
      return '';
    }
  }

  private recomputeChartItems(): void {
    const raw = this.rows.getRawValue();

    this.chartItems = raw
      .map(({ dateDisplay, value }) => {
        const iso = this.toIsoDate(dateDisplay ?? '');

        if (!iso || typeof value !== 'number' || Number.isNaN(value)) {
          return null;
        }

        return { date: iso, value };
      })
      .filter((p): p is HistoricalMetricPoint => p !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private renderChart(): void {
    if (!this.chartCanvas?.nativeElement) {
      return;
    }

    const labels = this.chartItems.map(({ date }) => this.toDisplayDate(date));
    const data = this.chartItems.map(({ value }) =>
      this.unit === 'percent' ? value * 100 : value
    );

    const config = {
      data: {
        labels,
        datasets: [
          {
            borderColor: 'rgb(66, 133, 244)',
            borderWidth: 3,
            data,
            fill: false,
            label: this.label,
            pointBackgroundColor: 'rgb(66, 133, 244)',
            pointRadius: 4,
            tension: 0
          }
        ]
      },
      options: {
        animation: false as const,
        aspectRatio: 16 / 9,
        plugins: {
          legend: { display: false },
          title: {
            align: 'center' as const,
            color: 'rgba(128, 128, 128, 0.9)',
            display: !!this.label,
            font: { size: 18, weight: 'normal' as const },
            padding: { bottom: 12, top: 4 },
            text: this.label
          },
          tooltip: {
            callbacks: {
              label: (ctx: { parsed: { y: number } }) =>
                this.formatValue(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(128, 128, 128, 0.15)', display: true },
            title: {
              color: 'rgba(128, 128, 128, 0.9)',
              display: true,
              text: 'Date'
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(128, 128, 128, 0.15)', display: true },
            max: this.unit === 'percent' ? 100 : undefined,
            min: this.unit === 'percent' ? 0 : undefined,
            ticks: {
              callback: (value: number | string) =>
                typeof value === 'number' ? this.formatValue(value) : value,
              stepSize: this.unit === 'percent' ? 20 : undefined
            },
            title: {
              color: 'rgba(128, 128, 128, 0.9)',
              display: !!this.yAxisLabel,
              text: this.yAxisLabel
            }
          }
        }
      }
    };

    if (this.chart) {
      this.chart.data = config.data;
      this.chart.options = config.options as never;
      this.chart.update();
    } else {
      this.chart = new Chart(this.chartCanvas.nativeElement, {
        ...config,
        type: 'line'
      } as never);
    }
  }

  private replaceRowsFrom(
    startIndex: number,
    points: HistoricalMetricPoint[]
  ): void {
    while (this.rows.length > startIndex) {
      this.rows.removeAt(this.rows.length - 1, { emitEvent: false });
    }

    for (const point of points) {
      this.rows.push(this.buildRow(point), { emitEvent: false });
    }

    this.emit();
  }

  private toDisplayDate(iso: string): string {
    const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);

    if (!match) {
      return '';
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const yy = String(year).slice(-2);

    return `${month}/${yy}`;
  }

  private toIsoDate(display: string): string | null {
    const match = /^(\d{1,2})\/(\d{1,4})$/.exec(display.trim());

    if (!match) {
      return null;
    }

    const month = Number(match[1]);
    let year = Number(match[2]);

    if (month < 1 || month > 12) {
      return null;
    }

    if (year < 100) {
      year = year <= 50 ? 2000 + year : 1900 + year;
    }

    return `${year}-${String(month).padStart(2, '0')}-01`;
  }
}
