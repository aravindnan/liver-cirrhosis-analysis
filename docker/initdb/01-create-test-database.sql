-- Runs once, when the Postgres container first creates its data volume.
-- A second database for the integration tests, which delete all data in it.
CREATE DATABASE cirrh0_test;
