### Resolution Steps

1. **Apply Schema Changes**:

   - Run `yarn prisma:generate-schema` to regenerate the schema file.
   - Run `yarn prisma:migrate` to apply the updated schema to the database. This will create the `declined_sessions` table and remove the invalid `duration` column from `Session`.

2. **Reset and Seed the Database**:

   - Run `yarn db:reset:dev` to reset the database and apply the new migrations.
   - Run `yarn prisma:seed:dev` to reseed the database with the corrected logic.

3. **Start the Cron Job**:
   - Run `yarn cron:auto-end` in a separate terminal to start the auto-end job.

### Commit Instructions


# Format the schema
yarn prisma:format

# Push schema changes to the database
yarn prisma:push

# Generate the Prisma client
yarn prisma:generate