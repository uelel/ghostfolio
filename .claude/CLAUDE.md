# CLAUDE.md

## Reference

See [README.md](../README.md) for the upstream Ghostfolio project overview, including the technology stack (NestJS + Angular + PostgreSQL + Prisma + Redis), self-hosting instructions, supported environment variables, and the public API reference.

For local development environment setup, refer to [DEVELOPMENT.md](../DEVELOPMENT.md).

## FORK

This app allows maintenance of a dividend portfolio:

- Add company tickers to the portfolio, including information such as purchase date, price, share quantity, sector, etc.
- Companies that are not part of the portfolio can also be added — same entity, but without a realized purchase.
- For each company, manage data such as prices, dividends, fundamental data (historical EPS, DPS), valuation (PE ratio, chart screenshot), financial data from each annual report, business description and investment thesis, competitive advantages, and risks.
- Configure a cron job to download up-to-date data for each company (prices, dividends, financial data).
- Filter the portfolio by any data (sector, dates, valuation, dividends, etc.).
- Portfolio overview — value evolution over time, dividend evolution over time, sector breakdown, etc.
