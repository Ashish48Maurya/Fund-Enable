require('dotenv').config()
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;
const mongoConnect = require('./db')
const router = require('./router/routes')
const cors = require('cors')

app.use(express.json())
app.use(cors());
app.use('/api', router)

app.get('/', async (req, res) => {
    return res.status(200).json({
        message: "Backend is Live 🎉🎉🎉"
    })
})

mongoConnect().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is listening at http://localhost:${PORT}`);
    });
}).catch((err) => {
    console.error(err.message);
    process.exit(1);
});