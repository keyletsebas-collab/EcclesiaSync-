-- EcclesiaSync PostgreSQL Schema
-- Run this once to create all tables

CREATE TABLE IF NOT EXISTS users (
    id        SERIAL PRIMARY KEY,
    uid       VARCHAR(36)  NOT NULL UNIQUE,
    username  VARCHAR(100) NOT NULL UNIQUE,
    password  VARCHAR(255) NOT NULL,
    "isMaster" BOOLEAN     DEFAULT FALSE,
    "accountId" VARCHAR(20) NOT NULL UNIQUE,
    "createdAt" VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS templates (
    id          VARCHAR(36)  PRIMARY KEY,
    "accountId"  VARCHAR(20)  NOT NULL,
    name        VARCHAR(255) NOT NULL,
    "customFields" JSONB      DEFAULT '[]',
    "createdAt"  VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_t_accountId ON templates ("accountId");

CREATE TABLE IF NOT EXISTS members (
    id              VARCHAR(36)  PRIMARY KEY,
    "templateId"     VARCHAR(36)  NOT NULL,
    "accountId"      VARCHAR(20)  NOT NULL,
    name            VARCHAR(255),
    number          INT,
    phone           VARCHAR(50),
    identifications JSONB        DEFAULT '{}',
    "createdAt"      VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_m_templateId ON members ("templateId");
CREATE INDEX IF NOT EXISTS idx_m_accountId  ON members ("accountId");

CREATE TABLE IF NOT EXISTS services (
    id            VARCHAR(36)  PRIMARY KEY,
    "templateId"   VARCHAR(36)  NOT NULL,
    "memberId"     VARCHAR(36)  NOT NULL,
    "accountId"    VARCHAR(20)  NOT NULL,
    "memberName"   VARCHAR(255),
    "serviceDate"  VARCHAR(50),
    "serviceType"  VARCHAR(255),
    "createdAt"    VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_s_accountId  ON services ("accountId");
CREATE INDEX IF NOT EXISTS idx_s_templateId ON services ("templateId");
