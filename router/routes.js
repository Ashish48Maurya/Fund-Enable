const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const router = express.Router();

const upload = multer({ dest: './uploads' });

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const filePath = path.resolve('./uploads', req.file.filename);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const collectionName = path.parse(req.file.originalname).name;
        const existingSchema = mongoose.connection.collections[collectionName];
        if (existingSchema) {
            fs.unlink(filePath, (err) => {
                if (err) console.error('Failed to delete file:', err);
            });
            return res.status(400).json({ message: 'Collection already exists, data not saved' });
        }

        const dynamicSchema = new mongoose.Schema({}, { strict: false });
        const DynamicModel = mongoose.model(collectionName, dynamicSchema, collectionName);

        const result = await DynamicModel.insertMany(sheetData);

        fs.unlink(filePath, (err) => {
            if (err) console.error('Failed to delete file:', err);
        });

        return res.status(200).json({
            message: 'Data saved successfully',
            insertedCount: result.length,
        });

    } catch (error) {
        console.error('Error uploading file:', error.message);
        return res.status(500).json({ error: `Internal Server Error ${error.message}` });
    }
});

router.get('/collections/:collectionName', async (req, res) => {
    const { collectionName } = req.params;
    try {
        const collection = await mongoose.connection.db.collection(collectionName);
        if (!collection) {
            return res.status(404).json({ error: `Collection '${collectionName}' not found` });
        }
        const data = await collection.find({}, { projection: { _id: 0, __v: 0 } }).toArray();
        if (data.length === 0) {
            return res.status(404).json({ error: `No data found in collection '${collectionName}'` });
        }
        res.status(200).json({
            message: 'Collection data retrieved successfully',
            data
        });
    } catch (error) {
        console.error('Error fetching collection data:', error.message);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
});

router.get('/collections', async (req, res) => {
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();

        res.status(200).json({
            message: 'Collections retrieved successfully',
            collections: collections.map(collection => collection.name)
        });
    } catch (error) {
        console.error('Error fetching collections:', error.message);
        res.status(500).json({ error: `Internal Server Error ${error.message}` });
    }
});

router.post('/collections/:collectionName', async (req, res) => {
    try {
        const { collectionName } = req.params;
        const data = req.body;
        console.log(data);
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'No data provided' });
        }

        const existingCollection = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();

        if (existingCollection.length === 0) {
            return res.status(400).json({ message: 'Collection does not exist' });
        }

        const dynamicSchema = new mongoose.Schema({}, { strict: false });
        const DynamicModel = mongoose.models[collectionName] || mongoose.model(collectionName, dynamicSchema, collectionName);

        const result = await DynamicModel.create(data);

        res.status(200).json({
            message: 'Data inserted successfully',
            insertedData: result,
        });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/download/:collectionName', async (req, res) => {
    try {
        const { collectionName } = req.params;
        const collection = await mongoose.connection.db.collection(collectionName);
        if (!collection) {
            return res.status(404).json({ error: `Collection '${collectionName}' not found` });
        }
        const data = await collection.find({}, { projection: { _id: 0, __v: 0 } }).toArray();

        if (data.length === 0) {
            return res.status(404).json({ error: `No data found in collection '${collectionName}'` });
        }
        return res.status(200).json({data})
    } catch (error) {
        console.error('Error fetching and downloading collection data:', error.message);
        res.status(500).json({ error: `Internal Server Error ${error.message}` });
    }
});

router.delete('/collections/:collectionName', async (req, res) => {
    try {
        const { collectionName } = req.params;
        const existingCollection = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
        if (existingCollection.length === 0) {
            return res.status(404).json({ error: `Collection '${collectionName}' not found` });
        }
        await mongoose.connection.db.dropCollection(collectionName);
        return res.status(200).json({ message: `Collection '${collectionName}' deleted successfully` });
    } catch (error) {
        console.error('Error deleting collection:', error.message);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
});


module.exports = router;