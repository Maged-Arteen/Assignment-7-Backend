// Import necessary modules
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
require('dotenv').config();

// Create Express app
const app = express();
app.use(bodyParser.json());

// Database connection
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'blogs',
    // waitForConnections: true,
    // connectionLimit: 10,
    // queueLimit: 0,
});

// Endpoint: Create Tables
app.post('/DB/create-tables', async (req, res) => {
    try {
        await db.promise().query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.promise().query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                userId INT,
                isDeleted BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (userId) REFERENCES users(id)
            );
        `);

        res.status(201).send({ message: 'Tables created successfully' });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Endpoint: User Signup
app.post('/user/signup', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const [rows] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length) return res.status(400).send({ message: 'Email already exists' });

        await db.promise().query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [
            name,
            email,
            password,
            role || 'user',
        ]);
        res.status(201).send({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Endpoint: User Login
app.post('/user/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.promise().query('SELECT * FROM users WHERE email = ? AND password = ?', [
            email,
            password,
        ]);
        if (!rows.length) return res.status(400).send({ message: 'Invalid credentials' });

        res.status(200).send({ message: 'Login successful' });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Endpoint: Add Product
app.post('/products', async (req, res) => {
    const { name, description, price, userId } = req.body;
    try {
        await db.promise().query('INSERT INTO products (name, description, price, userId) VALUES (?, ?, ?, ?)', [
            name,
            description,
            price,
            userId,
        ]);
        res.status(201).send({ message: 'Product added successfully' });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Endpoint: Soft Delete Product
app.patch('/products/soft-delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.promise().query('UPDATE products SET isDeleted = TRUE WHERE id = ?', [id]);
        res.status(200).send({ message: 'Product soft deleted' });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Endpoint: Get All Non-Deleted Products
app.get('/products', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT id, name AS productName, price AS cost
            FROM products
            WHERE isDeleted = FALSE
        `);
        res.status(200).send(rows);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
