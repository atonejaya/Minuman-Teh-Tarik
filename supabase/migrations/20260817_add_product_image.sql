-- Migration: Add image_url to Product table
-- Run this in Supabase SQL Editor

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS image_url TEXT;
