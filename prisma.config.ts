// Change this:
// import { defineConfig } from 'prisma'; 

// To this:
import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma', // Explicitly tell it where your schema is
  datasource: {
    url: 'file:./dev.db',
  },
});