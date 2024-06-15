const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer');

const app = express();
const port = 3000;

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
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/submit.html');
});

// Route to handle form submission
app.post('/submit', upload.array('image', 10), (req, res) => {
    const formData = req.body;
    const image = req.files.map(file => file.filename);

    // Insert form data into the database
    const sql = 'INSERT INTO cars (car_brand, model, numberplate, price, engine_capacity, horsepower, torque, mileage, fuel_type, transmission, registration_year, kms_driven, bodytype, ownership, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [
        formData.carbrand,
        formData.model,
        formData.numberplate,
        formData.price,
        formData.enginecapacity,
        formData.horsepower,
        formData.torque,
        formData.mileage,
        formData.fueltype,
        formData.transmission,
        formData.registrationyear,
        formData.kmsdriven,
        formData.bodytype,
        formData.ownership,
        image.join(',') // Concatenate filenames with a comma (or any other separator)
    ];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error inserting data into MySQL: ' + err.stack);
            return res.status(500).send('Error inserting data into database');
        }
        console.log('Data inserted into MySQL with ID: ' + result.insertId);
        res.send('Form submitted successfully!');
    });
});

// Route to fetch all cars
app.get('/cars', (req, res) => {
    const sql = 'SELECT * FROM cars';
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching data from MySQL: ' + err.stack);
            return res.status(500).send('Error fetching data from database');
        }
        res.json(results);
    });
});
// Route to fetch all soldout cars
app.get('/soldout_cars', (req, res) => {
    const sql = 'SELECT * FROM soldout_cars';
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching data from MySQL: ' + err.stack);
            return res.status(500).send('Error fetching data from database');
        }
        res.json(results);
    });
});


// Route to edit a car by ID
app.post('/edit/:id', (req, res) => {
    const carId = req.params.id;
    const updatedData = req.body;

    const sql = 'UPDATE cars SET car_brand = ?, model = ?,numberplate = ?, price = ?, engine_capacity = ?, horsepower = ?, torque = ?, mileage = ?, fuel_type = ?, transmission = ?, registration_year = ?, kms_driven = ?, bodytype = ?, ownership = ? WHERE id = ?';
    const values = [
        updatedData.carbrand,
        updatedData.model,
        updatedData.numberplate,
        updatedData.price,
        updatedData.engine_capacity,
        updatedData.horsepower,
        updatedData.torque,
        updatedData.mileage,
        updatedData.fuel_type,
        updatedData.transmission,
        updatedData.registration_year,
        updatedData.kms_driven,
        updatedData.bodytype,
        updatedData.ownership,
        carId
    ];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating data in MySQL: ' + err.stack);
            return res.status(500).send({ success: false, message: 'Error updating data in database' });
        }
        res.send({ success: true });
    });
});

// Route to delete a car by ID
app.delete('/delete/:id', (req, res) => {
    const carId = req.params.id;
    const sql = 'DELETE FROM cars WHERE id = ?';
    connection.query(sql, [carId], (err, result) => {
        if (err) {
            console.error('Error deleting data from MySQL: ' + err.stack);
            return res.status(500).send({ success: false, message: 'Error deleting data from database' });
        }
        res.send({ success: true });
    });
});

// Route to mark a car as sold out
app.post('/soldout/:id', (req, res) => {
    const carId = req.params.id;

    // Fetch the car data
    const fetchCarQuery = 'SELECT * FROM cars WHERE id = ?';
    connection.query(fetchCarQuery, [carId], (err, results) => {
        if (err) {
            console.error('Error fetching car data: ' + err.stack);
            return res.status(500).send('Error fetching car data');
        }

        if (results.length === 0) {
            return res.status(404).send('Car not found');
        }

        const car = results[0];

        // Insert car data into soldout_cars table
        const insertSoldOutCarQuery = 'INSERT INTO soldout_cars (id, car_brand, model, numberplate, price, engine_capacity, horsepower, torque, mileage, fuel_type, transmission, registration_year, kms_driven, bodytype, ownership, image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const soldOutCarValues = [
            car.id,
            car.car_brand,
            car.model,
            car.numberplate,
            car.price,
            car.engine_capacity,
            car.horsepower,
            car.torque,
            car.mileage,
            car.fuel_type,
            car.transmission,
            car.registration_year,
            car.kms_driven,
            car.bodytype,
            car.ownership,
            car.image,
            'Sold Out'
        ];

        connection.query(insertSoldOutCarQuery, soldOutCarValues, (err, result) => {
            if (err) {
                console.error('Error inserting data into soldout_cars table: ' + err.stack);
                return res.status(500).send('Error inserting data into soldout_cars table');
            }

            // Delete car from cars table
            const deleteCarQuery = 'DELETE FROM cars WHERE id = ?';
            connection.query(deleteCarQuery, [carId], (err, deleteResult) => {
                if (err) {
                    console.error('Error deleting car: ' + err.stack);
                    return res.status(500).send('Error deleting car from cars table');
                }

                res.send({ success: true });
            });
        });
    });
});

// Route to mark a car as not sold
app.post('/notsold/:id', (req, res) => {
    const carId = req.params.id;

    // Fetch the car data from soldout_cars table
    const fetchSoldOutCarQuery = 'SELECT * FROM soldout_cars WHERE id = ?';
    connection.query(fetchSoldOutCarQuery, [carId], (err, results) => {
        if (err) {
            console.error('Error fetching car data: ' + err.stack);
            return res.status(500).send('Error fetching car data');
        }

        if (results.length === 0) {
            return res.status(404).send('Car not found');
        }

        const car = results[0];

        // Insert car data back into cars table
        const insertCarQuery = 'INSERT INTO cars (id, car_brand, model, numberplate, price, engine_capacity, horsepower, torque, mileage, fuel_type, transmission, registration_year, kms_driven, bodytype, ownership, image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const carValues = [
            car.id,
            car.car_brand,
            car.model,
            car.numberplate,
            car.price,
            car.engine_capacity,
            car.horsepower,
            car.torque,
            car.mileage,
            car.fuel_type,
            car.transmission,
            car.registration_year,
            car.kms_driven,
            car.bodytype,
            car.ownership,
            car.image,
            'Available'
        ];

        connection.query(insertCarQuery, carValues, (err, result) => {
            if (err) {
                console.error('Error inserting data into cars table: ' + err.stack);
                return res.status(500).send('Error inserting data into cars table');
            }

            // Delete car from soldout_cars table
            const deleteSoldOutCarQuery = 'DELETE FROM soldout_cars WHERE id = ?';
            connection.query(deleteSoldOutCarQuery, [carId], (err, deleteResult) => {
                if (err) {
                    console.error('Error deleting car from soldout_cars table: ' + err.stack);
                    return res.status(500).send('Error deleting car from soldout_cars table');
                }

                res.send({ success: true });
            });
        });
    });
});

// Route to fetch all sellers
app.get('/sellers', (req, res) => {
    const query = 'SELECT * FROM sellers';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching sellers: ' + err.stack);
            res.status(500).send('Error fetching sellers');
            return;
        }
        res.json(results);
    });
});

// Route to delete a seller by ID
app.delete('/delete-seller/:id', (req, res) => {
    const sellerId = req.params.id;
    const query = 'DELETE FROM sellers WHERE id = ?';
    connection.query(query, [sellerId], (err, result) => {
        if (err) {
            console.error('Error deleting seller: ' + err.stack);
            res.status(500).send({ success: false, message: 'Error deleting seller' });
            return;
        }
        res.send({ success: true });
    });
});

// Route to approve a seller by ID
app.post('/approve-seller/:id', (req, res) => {
    const sellerId = req.params.id;
    const { price } = req.body;

    // Fetch seller details
    const fetchSellerQuery = 'SELECT * FROM sellers WHERE id = ?';
    connection.query(fetchSellerQuery, [sellerId], (err, results) => {
        if (err) {
            console.error('Error fetching seller: ' + err.stack);
            res.status(500).send('Error fetching seller details');
            return;
        }
        if (results.length === 0) {
            res.status(404).send('Seller not found');
            return;
        }

        const seller = results[0];

        // Insert seller data into cars table
        const insertCarQuery = 'INSERT INTO cars (car_brand, model, numberplate, price, engine_capacity, horsepower, torque, mileage, fuel_type, transmission, registration_year, kms_driven, bodytype, ownership, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const carValues = [
            seller.car_brand,
            seller.model,
            seller.numberplate,
            price,
            seller.engine_capacity,
            seller.horsepower,
            seller.torque,
            seller.mileage,
            seller.fuel_type,
            seller.transmission,
            seller.registration_year,
            seller.kms_driven,
            seller.bodytype,
            seller.ownership,
            seller.image // Assuming image paths are stored as comma-separated strings
        ];

        connection.query(insertCarQuery, carValues, (err, result) => {
            if (err) {
                console.error('Error inserting data into cars table: ' + err.stack);
                res.status(500).send('Error approving seller');
                return;
            }

            // Delete seller from sellers table
            const deleteSellerQuery = 'DELETE FROM sellers WHERE id = ?';
            connection.query(deleteSellerQuery, [sellerId], (err, deleteResult) => {
                if (err) {
                    console.error('Error deleting seller: ' + err.stack);
                    res.status(500).send('Error deleting seller after approval');
                    return;
                }

                res.send({ success: true });
            });
        });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
