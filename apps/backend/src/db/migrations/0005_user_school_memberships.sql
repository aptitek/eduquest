CREATE TABLE "user_school_memberships" (
	"user_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"institutional_email" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_school_memberships_user_id_school_id_pk" PRIMARY KEY("user_id","school_id"),
	CONSTRAINT "user_school_memberships_institutional_email_unique" UNIQUE("institutional_email")
);
--> statement-breakpoint
ALTER TABLE "user_school_memberships" ADD CONSTRAINT "user_school_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_school_memberships" ADD CONSTRAINT "user_school_memberships_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "user_school_memberships" ("user_id", "school_id", "institutional_email", "created_at", "updated_at")
SELECT DISTINCT ON (st."user_id", COALESCE(c."school_id", st."school_id"))
	st."user_id",
	COALESCE(c."school_id", st."school_id") AS "school_id",
	sc."institutional_email",
	COALESCE(sc."created_at", st."created_at", now()),
	now()
FROM "students" st
LEFT JOIN "student_cohorts" sc ON sc."student_id" = st."id"
LEFT JOIN "cohorts" c ON c."id" = sc."cohort_id"
WHERE COALESCE(c."school_id", st."school_id") IS NOT NULL
ORDER BY st."user_id", COALESCE(c."school_id", st."school_id"), sc."created_at" DESC NULLS LAST
ON CONFLICT ("user_id", "school_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_school_memberships" ("user_id", "school_id", "institutional_email", "created_at", "updated_at")
SELECT u."id", s."id", NULL, now(), now()
FROM "users" u
CROSS JOIN LATERAL (
	SELECT "id"
	FROM "schools"
	WHERE lower("name") = 'aptitek'
	ORDER BY "created_at" NULLS LAST
	LIMIT 1
) s
WHERE u."is_admin" = true
ON CONFLICT ("user_id", "school_id") DO NOTHING;
