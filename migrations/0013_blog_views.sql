-- Blog article view counter (used by REST /api/blogs/:id/view and public listings)
ALTER TABLE "Blog" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;
