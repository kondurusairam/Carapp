const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3001;

// MySQL Connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'carsdata'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL as id ' + connection.threadId);
});

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve static files from the public and uploads directories
app.use(express.static('public2'));
app.use('/uploads', express.static('uploads'));

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public2/home.html');
});

// Route to fetch car data with filters from both cars and soldout_cars tables
app.get('/cars', (req, res) => {
    const { car_brand, minPrice, maxPrice, minYear, maxYear, fueltype, transmission, bodytype, ownership } = req.query;

    let query = 'SELECT * FROM cars WHERE 1=1';
    let soldOutQuery = 'SELECT * FROM soldout_cars WHERE 1=1';
    let queryParams = [];
    let soldOutQueryParams = [];

    if (car_brand && car_brand !== 'Other') {
        query += ' AND car_brand = ?';
        soldOutQuery += ' AND car_brand = ?';
        queryParams.push(car_brand);
        soldOutQueryParams.push(car_brand);
    } else if (car_brand === 'Other') {
        const knownBrands = ['Maruti', 'Hyundai', 'Tata', 'Honda', 'Toyota', 'Skoda', 'Volkswagen', 'Ford'];
        query += ' AND car_brand NOT IN (?)';
        soldOutQuery += ' AND car_brand NOT IN (?)';
        queryParams.push(knownBrands);
        soldOutQueryParams.push(knownBrands);
    }

    if (minPrice) {
        query += ' AND price >= ?';
        soldOutQuery += ' AND price >= ?';
        queryParams.push(parseInt(minPrice));
        soldOutQueryParams.push(parseInt(minPrice));
    }

    if (maxPrice) {
        query += ' AND price <= ?';
        soldOutQuery += ' AND price <= ?';
        queryParams.push(parseInt(maxPrice));
        soldOutQueryParams.push(parseInt(maxPrice));
    }

    if (minYear) {
        query += ' AND registration_year >= ?';
        soldOutQuery += ' AND registration_year >= ?';
        queryParams.push(parseInt(minYear));
        soldOutQueryParams.push(parseInt(minYear));
    }

    if (maxYear) {
        query += ' AND registration_year <= ?';
        soldOutQuery += ' AND registration_year <= ?';
        queryParams.push(parseInt(maxYear));
        soldOutQueryParams.push(parseInt(maxYear));
    }

    if (fueltype) {
        query += ' AND fuel_type = ?';
        soldOutQuery += ' AND fuel_type = ?';
        queryParams.push(fueltype);
        soldOutQueryParams.push(fueltype);
    }

    if (transmission) {
        query += ' AND transmission = ?';
        soldOutQuery += ' AND transmission = ?';
        queryParams.push(transmission);
        soldOutQueryParams.push(transmission);
    }

    if (bodytype) {
        query += ' AND bodytype = ?';
        soldOutQuery += ' AND bodytype = ?';
        queryParams.push(bodytype);
        soldOutQueryParams.push(bodytype);
    }

    if (ownership) {
        query += ' AND ownership = ?';
        soldOutQuery += ' AND ownership = ?';
        queryParams.push(ownership);
        soldOutQueryParams.push(ownership);
    }

    connection.query(query, queryParams, (err, carResults) => {
        if (err) {
            console.error('Error fetching cars: ' + err.stack);
            return res.status(500).send('Error fetching cars');
        }

        connection.query(soldOutQuery, soldOutQueryParams, (err, soldOutResults) => {
            if (err) {
                console.error('Error fetching sold out cars: ' + err.stack);
                return res.status(500).send('Error fetching sold out cars');
            }

            const results = [...carResults, ...soldOutResults];
            res.json(results);
        });
    });
});
app.get('/car-details/:id', (req, res) => {
    const carId = req.params.id;
    const query = 'SELECT * FROM cars WHERE id = ?';
    connection.query(query, [carId], (err, results) => {
        if (err) {
            console.error('Error fetching car details: ' + err.stack);
            res.status(500).send('Error fetching car details');
            return;
        }
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).send('Car not found');
        }
    });
});
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
