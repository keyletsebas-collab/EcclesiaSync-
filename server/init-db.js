import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});

const statements = [
    `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        isMaster TINYINT(1) DEFAULT 0,
        accountId VARCHAR(20) NOT NULL UNIQUE,
        createdAt VARCHAR(50)
    )`,
    `CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(36) PRIMARY KEY,
        accountId VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        customFields TEXT,
        createdAt VARCHAR(50),
        INDEX idx_t_accountId (accountId)
    )`,
    `CREATE TABLE IF NOT EXISTS members (
        id VARCHAR(36) PRIMARY KEY,
        templateId VARCHAR(36) NOT NULL,
        accountId VARCHAR(20) NOT NULL,
        name VARCHAR(255),
        number INT,
        phone VARCHAR(50),
        identifications TEXT,
        createdAt VARCHAR(50),
        INDEX idx_m_templateId (templateId),
        INDEX idx_m_accountId (accountId)
    )`,
    `CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(36) PRIMARY KEY,
        templateId VARCHAR(36) NOT NULL,
        memberId VARCHAR(36) NOT NULL,
        accountId VARCHAR(20) NOT NULL,
        memberName VARCHAR(255),
        serviceDate VARCHAR(50),
        serviceType VARCHAR(255),
        createdAt VARCHAR(50),
        INDEX idx_s_accountId (accountId),
        INDEX idx_s_templateId (templateId)
    )`
];

async function init() {
    console.log('🔄 Creating tables...');
    for (const sql of statements) {
        const tableName = sql.match(/TABLE IF NOT EXISTS (\w+)/)[1];
        try {
            await pool.query(sql);
            console.log(`  ✅ Table "${tableName}" ready`);
        } catch (err) {
            console.error(`  ❌ Failed "${tableName}":`, err.message);
        }
    }
    console.log('Done!');
    await pool.end();
}

init();
