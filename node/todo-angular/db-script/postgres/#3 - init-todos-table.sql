DROP TABLE IF EXISTS "TodoItem";
CREATE TABLE "TodoItem" (
  "Id" SERIAL,
  "Description" varchar(30) NOT NULL DEFAULT '',
  "CreatedAt" timestamp NOT NULL DEFAULT '1900-01-01 08:00:00',
  "IsDone" boolean NOT NULL DEFAULT '0',
  "IsArchived" boolean NOT NULL DEFAULT '0',
  PRIMARY KEY ("Id")
);

ALTER TABLE "TodoItem" OWNER TO "demo";

INSERT INTO "TodoItem" ("Id", "Description", "CreatedAt", "IsDone", "IsArchived")
VALUES (10,'Food','2012-09-22 21:01:01',true,true),
    (11,'Water','2012-09-22 21:02:01',true,true),
    (12,'Shelter','2012-09-22 21:03:01',true,true),
    (13,'Bread','2012-09-22 21:04:01',false,false),
    (14,'Cheese','2012-09-22 21:05:01',true,false),
    (15,'Wine','2012-09-22 21:06:01',false,false);