-- ChurchManager Database Schema
-- Run this once to create all tables

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    isMaster TINYINT(1) DEFAULT 0,
    accountId VARCHAR(20) NOT NULL UNIQUE,
    createdAt VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR(36) PRIMARY KEY,
    accountId VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    customFields TEXT,
    createdAt VARCHAR(50),
    INDEX idx_accountId (accountId)
);

CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(36) PRIMARY KEY,
    templateId VARCHAR(36) NOT NULL,
    accountId VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    number INT,
    phone VARCHAR(50),
    identifications TEXT,
    createdAt VARCHAR(50),
    INDEX idx_templateId (templateId),
    INDEX idx_accountId (accountId)
);

CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(36) PRIMARY KEY,
    templateId VARCHAR(36) NOT NULL,
    memberId VARCHAR(36) NOT NULL,
    accountId VARCHAR(20) NOT NULL,
    memberName VARCHAR(255),
    serviceDate VARCHAR(50),
    serviceType VARCHAR(255),
    createdAt VARCHAR(50),
    INDEX idx_accountId (accountId),
    INDEX idx_templateId (templateId)
);
