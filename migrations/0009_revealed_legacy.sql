-- Treat historically approved submissions as published (visible on portfolio).
UPDATE "Submission" SET "revealed" = 1 WHERE "isApproved" = 1 AND ("revealed" = 0 OR "revealed" IS NULL);
