import { UpdateAssetProfileFinancialsDto } from '@ghostfolio/common/dtos';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { AssetProfileFinancials } from '@ghostfolio/common/interfaces';
import {
  DataSource,
  FinancialsCurrency,
  FinancialsScale
} from '@ghostfolio/prisma/enums';
import { AdminService } from '@ghostfolio/ui/services/admin.service';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { IonIcon } from '@ionic/angular/standalone';
import { format, isValid, subDays } from 'date-fns';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';

type RowGroup = FormGroup<{
  name: FormControl<string | null>;
  percent: FormControl<number | null>;
}>;

type ColumnFormGroup = FormGroup<{
  capex: FormControl<number | null>;
  capexScale: FormControl<FinancialsScale | null>;
  cash: FormControl<number | null>;
  cashScale: FormControl<FinancialsScale | null>;
  currency: FormControl<FinancialsCurrency | null>;
  currentDebt: FormControl<number | null>;
  currentDebtScale: FormControl<FinancialsScale | null>;
  date: FormControl<Date | null>;
  debtRating: FormControl<string | null>;
  dividendYieldPercent: FormControl<number | null>;
  dividendsPerShare: FormControl<number | null>;
  earningsGeographyRows: FormArray<RowGroup>;
  longTermDebt: FormControl<number | null>;
  longTermDebtScale: FormControl<FinancialsScale | null>;
  marketCap: FormControl<number | null>;
  marketCapScale: FormControl<FinancialsScale | null>;
  netIncome: FormControl<number | null>;
  netIncomeScale: FormControl<FinancialsScale | null>;
  netWorth: FormControl<number | null>;
  netWorthScale: FormControl<FinancialsScale | null>;
  revenueShareRows: FormArray<RowGroup>;
}>;

interface Column {
  form: ColumnFormGroup;
  id: string;
}

type DynamicSection = 'revenueShare' | 'earningsGeography';

type ValueControlName =
  | 'capex'
  | 'cash'
  | 'currentDebt'
  | 'longTermDebt'
  | 'marketCap'
  | 'netIncome'
  | 'netWorth';

type ScaleControlName =
  | 'capexScale'
  | 'cashScale'
  | 'currentDebtScale'
  | 'longTermDebtScale'
  | 'marketCapScale'
  | 'netIncomeScale'
  | 'netWorthScale';

type RowDescriptor =
  | { kind: 'currency' }
  | { kind: 'section'; label: string }
  | { kind: 'dynamic'; section: DynamicSection; rowIndex: number }
  | { kind: 'addRow'; section: DynamicSection }
  | {
      kind: 'money';
      label: string;
      scaleControl: ScaleControlName;
      valueControl: ValueControlName;
    }
  | { kind: 'text'; label: string; control: 'debtRating' }
  | {
      kind: 'number';
      label: string;
      control: 'dividendsPerShare' | 'dividendYieldPercent';
    }
  | { kind: 'delete' };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonIcon,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    ReactiveFormsModule
  ],
  selector: 'gf-financials-table',
  standalone: true,
  styleUrls: ['./financials-table.component.scss'],
  templateUrl: './financials-table.component.html'
})
export class GfFinancialsTableComponent implements OnChanges, OnDestroy {
  @Input() canEdit = false;
  @Input() dataSource!: DataSource;
  @Input() financials: AssetProfileFinancials[] = [];
  @Input() symbol!: string;

  @Output() changed = new EventEmitter<void>();

  protected columns: Column[] = [];
  protected readonly currencyOptions = Object.values(FinancialsCurrency);
  protected displayedColumns: string[] = ['label', 'add'];
  protected rows: RowDescriptor[] = [];
  protected readonly scaleOptions = Object.values(FinancialsScale);

  private readonly adminService = inject(AdminService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly moneyFields: {
    label: string;
    scaleControl: ScaleControlName;
    valueControl: ValueControlName;
  }[] = [
    {
      label: $localize`Net income`,
      scaleControl: 'netIncomeScale',
      valueControl: 'netIncome'
    },
    {
      label: $localize`Capex`,
      scaleControl: 'capexScale',
      valueControl: 'capex'
    },
    { label: $localize`Cash`, scaleControl: 'cashScale', valueControl: 'cash' },
    {
      label: $localize`Current debt`,
      scaleControl: 'currentDebtScale',
      valueControl: 'currentDebt'
    },
    {
      label: $localize`Long-term debt`,
      scaleControl: 'longTermDebtScale',
      valueControl: 'longTermDebt'
    },
    {
      label: $localize`Net worth`,
      scaleControl: 'netWorthScale',
      valueControl: 'netWorth'
    },
    {
      label: $localize`Market cap`,
      scaleControl: 'marketCapScale',
      valueControl: 'marketCap'
    }
  ];
  private readonly patchSubscriptions = new Set<Subscription>();

  public constructor() {
    addIcons({ addOutline, trashOutline });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes.financials) {
      this.rebuildColumns();
    }
  }

  public ngOnDestroy(): void {
    this.disposePatchSubscriptions();
  }

  protected columnId(column: Column): string {
    return 'snap-' + column.id;
  }

  protected dynamicPercentControl(
    column: Column,
    section: DynamicSection,
    rowIndex: number
  ): FormControl<number | null> | null {
    const array = this.dynamicRows(column, section);

    if (rowIndex >= array.length) {
      return null;
    }

    return array.at(rowIndex).controls.percent;
  }

  protected dynamicRowNameControl(
    section: DynamicSection,
    rowIndex: number
  ): FormControl<string | null> | null {
    const firstColumn = this.columns[0];

    if (!firstColumn) {
      return null;
    }

    const array = this.dynamicRows(firstColumn, section);

    if (rowIndex >= array.length) {
      return null;
    }

    return array.at(rowIndex).controls.name;
  }

  protected isAddRow = (_: number, row: RowDescriptor): boolean => {
    return row.kind === 'addRow';
  };

  protected isSectionRow = (_: number, row: RowDescriptor): boolean => {
    return row.kind === 'section';
  };

  protected isStandardRow = (_: number, row: RowDescriptor): boolean => {
    return row.kind !== 'section' && row.kind !== 'addRow';
  };

  protected trackRow = (index: number, row: RowDescriptor): string => {
    switch (row.kind) {
      case 'dynamic':
        return `${row.section}:${row.rowIndex}`;
      case 'addRow':
        return `addRow:${row.section}`;
      case 'section':
        return `section:${row.label}`;
      case 'money':
        return `money:${row.valueControl}`;
      case 'text':
      case 'number':
        return `${row.kind}:${row.control}`;
      default:
        return `${row.kind}:${index}`;
    }
  };

  protected onAddColumn(): void {
    const usedDates = new Set(
      this.financials.map((snapshot) => {
        return format(new Date(snapshot.date), DATE_FORMAT);
      })
    );

    let candidate = new Date();

    while (usedDates.has(format(candidate, DATE_FORMAT))) {
      candidate = subDays(candidate, 1);
    }

    this.adminService
      .postAssetProfileFinancials({
        dataSource: this.dataSource,
        financials: { date: format(candidate, DATE_FORMAT) },
        symbol: this.symbol
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.changed.emit();
      });
  }

  protected onAddDynamicRow(section: DynamicSection): void {
    for (const column of this.columns) {
      this.dynamicRows(column, section).push(this.createRowGroup());
    }

    this.recomputeRows();
    this.changeDetectorRef.markForCheck();
  }

  protected onDeleteColumn(column: Column): void {
    this.adminService
      .deleteAssetProfileFinancials({
        dataSource: this.dataSource,
        id: column.id,
        symbol: this.symbol
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.changed.emit();
      });
  }

  protected onDynamicRowNameChange(
    section: DynamicSection,
    rowIndex: number,
    name: string
  ): void {
    for (const column of this.columns) {
      const array = this.dynamicRows(column, section);

      if (rowIndex < array.length) {
        array.at(rowIndex).controls.name.setValue(name);
      }
    }
  }

  protected onRemoveDynamicRow(
    section: DynamicSection,
    rowIndex: number
  ): void {
    for (const column of this.columns) {
      const array = this.dynamicRows(column, section);

      if (rowIndex < array.length) {
        array.removeAt(rowIndex);
      }
    }

    this.recomputeRows();
    this.changeDetectorRef.markForCheck();
  }

  private buildColumnForm(snapshot: AssetProfileFinancials): ColumnFormGroup {
    const form = this.formBuilder.group({
      capex: this.formBuilder.control<number | null>(snapshot.capex),
      capexScale: this.formBuilder.control<FinancialsScale | null>(
        snapshot.capexScale
      ),
      cash: this.formBuilder.control<number | null>(snapshot.cash),
      cashScale: this.formBuilder.control<FinancialsScale | null>(
        snapshot.cashScale
      ),
      currency: this.formBuilder.control<FinancialsCurrency | null>(
        snapshot.currency
      ),
      currentDebt: this.formBuilder.control<number | null>(
        snapshot.currentDebt
      ),
      currentDebtScale: this.formBuilder.control<FinancialsScale | null>(
        snapshot.currentDebtScale
      ),
      date: this.formBuilder.control<Date | null>(new Date(snapshot.date)),
      debtRating: this.formBuilder.control<string | null>(snapshot.debtRating),
      dividendYieldPercent: this.formBuilder.control<number | null>(
        snapshot.dividendYieldPercent
      ),
      dividendsPerShare: this.formBuilder.control<number | null>(
        snapshot.dividendsPerShare
      ),
      earningsGeographyRows: this.formBuilder.array(
        snapshot.earningsGeographyRows.map((row) => {
          return this.createRowGroup(row.name, row.percent);
        })
      ),
      longTermDebt: this.formBuilder.control<number | null>(
        snapshot.longTermDebt
      ),
      longTermDebtScale: this.formBuilder.control<FinancialsScale | null>(
        snapshot.longTermDebtScale
      ),
      marketCap: this.formBuilder.control<number | null>(snapshot.marketCap),
      marketCapScale: this.formBuilder.control<FinancialsScale | null>(
        snapshot.marketCapScale
      ),
      netIncome: this.formBuilder.control<number | null>(snapshot.netIncome),
      netIncomeScale: this.formBuilder.control<FinancialsScale | null>(
        snapshot.netIncomeScale
      ),
      netWorth: this.formBuilder.control<number | null>(snapshot.netWorth),
      netWorthScale: this.formBuilder.control<FinancialsScale | null>(
        snapshot.netWorthScale
      ),
      revenueShareRows: this.formBuilder.array(
        snapshot.revenueShareRows.map((row) => {
          return this.createRowGroup(row.name, row.percent);
        })
      )
    });

    if (!this.canEdit) {
      form.disable({ emitEvent: false });
    }

    return form;
  }

  private createRowGroup(name = '', percent: number | null = null): RowGroup {
    return this.formBuilder.group({
      name: this.formBuilder.control<string | null>(name),
      percent: this.formBuilder.control<number | null>(percent)
    });
  }

  private disposePatchSubscriptions(): void {
    this.patchSubscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });

    this.patchSubscriptions.clear();
  }

  private dynamicRows(
    column: Column,
    section: DynamicSection
  ): FormArray<RowGroup> {
    return section === 'revenueShare'
      ? column.form.controls.revenueShareRows
      : column.form.controls.earningsGeographyRows;
  }

  private padDynamicRows(section: DynamicSection): void {
    const max = this.columns.reduce((acc, column) => {
      return Math.max(acc, this.dynamicRows(column, section).length);
    }, 0);

    for (const column of this.columns) {
      const array = this.dynamicRows(column, section);

      while (array.length < max) {
        array.push(this.createRowGroup());
      }
    }

    this.syncDynamicRowNames(section);
  }

  private rebuildColumns(): void {
    this.disposePatchSubscriptions();

    this.columns = this.financials.map((snapshot) => {
      const form = this.buildColumnForm(snapshot);

      const subscription = form.valueChanges
        .pipe(
          debounceTime(500),
          filter(() => {
            return this.canEdit && form.valid;
          })
        )
        .subscribe(() => {
          const payload = this.toPatchPayload(form.getRawValue());

          this.adminService
            .patchAssetProfileFinancials({
              dataSource: this.dataSource,
              financials: payload,
              id: snapshot.id,
              symbol: this.symbol
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
        });

      this.patchSubscriptions.add(subscription);

      return { form, id: snapshot.id };
    });

    this.padDynamicRows('revenueShare');
    this.padDynamicRows('earningsGeography');

    this.displayedColumns = [
      'label',
      ...this.columns.map((column) => {
        return this.columnId(column);
      }),
      'add'
    ];

    this.recomputeRows();
    this.changeDetectorRef.markForCheck();
  }

  private recomputeRows(): void {
    const revenueShareCount = this.sharedDynamicLength('revenueShare');
    const earningsGeographyCount =
      this.sharedDynamicLength('earningsGeography');

    const dynamicRevenueShare: RowDescriptor[] = Array.from(
      { length: revenueShareCount },
      (_, rowIndex) => {
        return {
          kind: 'dynamic' as const,
          rowIndex,
          section: 'revenueShare' as const
        };
      }
    );

    const dynamicEarningsGeography: RowDescriptor[] = Array.from(
      { length: earningsGeographyCount },
      (_, rowIndex) => {
        return {
          kind: 'dynamic' as const,
          rowIndex,
          section: 'earningsGeography' as const
        };
      }
    );

    const rows: RowDescriptor[] = [
      { kind: 'currency' },
      { kind: 'section', label: $localize`Revenue share (%)` },
      ...dynamicRevenueShare,
      { kind: 'addRow', section: 'revenueShare' },
      { kind: 'section', label: $localize`Earnings geography (%)` },
      ...dynamicEarningsGeography,
      { kind: 'addRow', section: 'earningsGeography' },
      { kind: 'section', label: $localize`Financials` }
    ];

    for (const field of this.moneyFields) {
      rows.push({
        kind: 'money',
        label: field.label,
        scaleControl: field.scaleControl,
        valueControl: field.valueControl
      });
    }

    rows.push({
      control: 'debtRating',
      kind: 'text',
      label: $localize`Debt rating`
    });

    rows.push(
      { kind: 'section', label: $localize`Dividends` },
      {
        control: 'dividendsPerShare',
        kind: 'number',
        label: $localize`Dividends / share`
      },
      {
        control: 'dividendYieldPercent',
        kind: 'number',
        label: $localize`Dividend yield (%)`
      },
      { kind: 'delete' }
    );

    this.rows = rows;
  }

  private sharedDynamicLength(section: DynamicSection): number {
    if (this.columns.length === 0) {
      return 0;
    }

    return this.dynamicRows(this.columns[0], section).length;
  }

  private syncDynamicRowNames(section: DynamicSection): void {
    if (this.columns.length < 2) {
      return;
    }

    const source = this.dynamicRows(this.columns[0], section);

    for (let i = 0; i < source.length; i++) {
      const name = source.at(i).controls.name.value ?? '';

      if (name.length === 0) {
        for (const column of this.columns.slice(1)) {
          const other = this.dynamicRows(column, section);

          if (
            i < other.length &&
            (other.at(i).controls.name.value ?? '').length > 0
          ) {
            source
              .at(i)
              .controls.name.setValue(other.at(i).controls.name.value);
            break;
          }
        }
      }
    }

    const canonical = source;

    for (const column of this.columns.slice(1)) {
      const other = this.dynamicRows(column, section);

      for (let i = 0; i < canonical.length; i++) {
        if (i >= other.length) {
          continue;
        }

        const target = other.at(i).controls.name;
        const value = canonical.at(i).controls.name.value;

        if (target.value !== value) {
          target.setValue(value, { emitEvent: false });
        }
      }
    }
  }

  private toPatchPayload(
    value: ReturnType<ColumnFormGroup['getRawValue']>
  ): UpdateAssetProfileFinancialsDto {
    const date =
      value.date instanceof Date && isValid(value.date)
        ? format(value.date, DATE_FORMAT)
        : undefined;

    return {
      capex: value.capex,
      capexScale: value.capexScale,
      cash: value.cash,
      cashScale: value.cashScale,
      currency: value.currency,
      currentDebt: value.currentDebt,
      currentDebtScale: value.currentDebtScale,
      date,
      debtRating: value.debtRating,
      dividendYieldPercent: value.dividendYieldPercent,
      dividendsPerShare: value.dividendsPerShare,
      earningsGeographyRows: (value.earningsGeographyRows ?? [])
        .filter((row) => {
          return (row.name ?? '').length > 0 && typeof row.percent === 'number';
        })
        .map((row) => {
          return { name: row.name!, percent: row.percent! };
        }),
      longTermDebt: value.longTermDebt,
      longTermDebtScale: value.longTermDebtScale,
      marketCap: value.marketCap,
      marketCapScale: value.marketCapScale,
      netIncome: value.netIncome,
      netIncomeScale: value.netIncomeScale,
      netWorth: value.netWorth,
      netWorthScale: value.netWorthScale,
      revenueShareRows: (value.revenueShareRows ?? [])
        .filter((row) => {
          return (row.name ?? '').length > 0 && typeof row.percent === 'number';
        })
        .map((row) => {
          return { name: row.name!, percent: row.percent! };
        })
    };
  }
}
