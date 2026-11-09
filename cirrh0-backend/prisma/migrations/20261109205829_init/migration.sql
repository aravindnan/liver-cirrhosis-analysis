-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "YesNo" AS ENUM ('Y', 'N');

-- CreateEnum
CREATE TYPE "Edema" AS ENUM ('Y', 'S', 'N');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" "Gender",
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "age" INTEGER,
    "sex" "Gender",
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "date" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ascites" "YesNo",
    "edema" "Edema",
    "spiders" "YesNo",
    "hepatomegaly" "YesNo",
    "bilirubin" DOUBLE PRECISION,
    "albumin" DOUBLE PRECISION,
    "prothrombin" DOUBLE PRECISION,
    "platelets" DOUBLE PRECISION,
    "sgot" DOUBLE PRECISION,
    "alt" DOUBLE PRECISION,
    "copper" DOUBLE PRECISION,
    "alk_phos" DOUBLE PRECISION,
    "triglycerides" DOUBLE PRECISION,
    "cholesterol" DOUBLE PRECISION,
    "stage" INTEGER,
    "model_version" TEXT,
    "analysis" TEXT,
    "lifestyle_recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "precautions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "self_treatment_plan" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "doctor_type" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scores" JSONB,
    "scores_version" TEXT,
    "draft_expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "report_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "age" INTEGER,
    "sex" TEXT,
    "file" TEXT,
    "date" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysis" TEXT,
    "diagnosis" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lifestyle_recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "precautions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medical_treatments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "doctor_type" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "image_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "report_analyses_user_id_date_idx" ON "report_analyses"("user_id", "date" DESC);

-- CreateIndex
CREATE INDEX "report_analyses_draft_expires_at_idx" ON "report_analyses"("draft_expires_at");

-- CreateIndex
CREATE INDEX "image_analyses_user_id_date_idx" ON "image_analyses"("user_id", "date" DESC);

-- AddForeignKey
ALTER TABLE "report_analyses" ADD CONSTRAINT "report_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_analyses" ADD CONSTRAINT "image_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Constraints Prisma cannot express in the schema. The API validates the same rules; these keep the
-- database consistent even if something writes to it directly.
ALTER TABLE "report_analyses" ADD CONSTRAINT "report_analyses_stage_range" CHECK ("stage" IS NULL OR "stage" BETWEEN 1 AND 4);
ALTER TABLE "report_analyses" ADD CONSTRAINT "report_analyses_age_range" CHECK ("age" IS NULL OR "age" BETWEEN 0 AND 130);
ALTER TABLE "image_analyses" ADD CONSTRAINT "image_analyses_age_range" CHECK ("age" IS NULL OR "age" BETWEEN 0 AND 130);
ALTER TABLE "users" ADD CONSTRAINT "users_age_range" CHECK ("age" IS NULL OR "age" BETWEEN 0 AND 130);
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email"));
