-- Competitive rank by XP only (equal XP => equal rank). Includes 0 XP.
UPDATE "User" SET rank = (
  SELECT COUNT(*) + 1
  FROM "User" u2
  WHERE u2.points > "User".points
);
