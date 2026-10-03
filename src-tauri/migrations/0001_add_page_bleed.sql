-- Add print bleed margin to pages (drawn as a trim/safe-area guide; 0 = none).
ALTER TABLE `pages` ADD COLUMN `bleed` integer DEFAULT 0 NOT NULL;
