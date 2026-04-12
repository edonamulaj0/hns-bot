# Greenfield D1 migrations (reference)

For a **brand-new** D1 database, you can apply a single consolidated SQL export of the final Prisma schema instead of replaying the repo’s historical `migrations/` chain (which reflects iterative development).

Production deployments that already use `migrations/0001_*.sql` … `0008_*.sql` should **continue applying incremental files** with:

```bash
wrangler d1 migrations apply DB --remote
```

The authoritative schema is `prisma/schema.prisma`. After edits, you can generate a baseline with:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > migrations-greenfield/baseline.sql
```

Review and split into ordered files if your ops policy requires numbered steps.
