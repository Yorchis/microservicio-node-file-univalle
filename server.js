const express = require('express');

const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const fs = require('fs');
const app = express();

app.use(bodyParser.json())
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// Middlewares
app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.use(cors());

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST', 'PUT', 'DELETE', 'OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

const mongoURI = 'mongodb+srv://user_4_cluster_node:480g3nNKs8njluAs@cluster4node.pspve7c.mongodb.net/';

const conn = mongoose.createConnection(mongoURI);

let gfs; let gridfsBucket;
conn.once('open', () => {
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    });

    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
})

const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                //const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: file.originalname,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});

const upload = multer({ storage });

// @route GET /upload
// @desc load from
app.get('/', (req, res) => {

    res.render('index');
});

// @route POST /upload
// @desc Uploads file to db
// 'file' is the name of the input type file
app.post('/upload', upload.single('file'), (req, res) => {
    return res.json({
        file: req.file,
        status: true,
        message: "El archivo ha sido registrado"
    });
    //res.redirect('/');
});


// @route GET /files
// @desc get all files
app.get('/files', async (req, res) => {

    const files = await conn.db.collection('uploads.files').find().toArray();
    if (!files) {
        return res.status(404).json({
            err: 'no files exists'
        })
    }
    //files exists
    return res.json({
        data: files,
        status: true
    });
});

// @route GET /files/:id
// @desc get one file
app.get('/files/:id', async (req, res) => {
    const obj_id = new mongoose.Types.ObjectId(req.params.id);
    const files = await gridfsBucket.find({ "_id": obj_id }).toArray();
    if (files.length === 0) {
        return res.status(404).json({
            err: 'no files exists'
        });
    }
    return res.json(...files);
});

// @route GET /image/:filename
// @desc display single file object
app.get('/image/:id', async (req, res) => {

    const obj_id = new mongoose.Types.ObjectId(req.params.id);
    const files = await gridfsBucket.find({ "_id": obj_id }).toArray();
    if (files.length === 0) {
        return res.status(404).json({
            err: 'no files exists'
        });
    }

    const file = files[0];
    //check if image


    if (file.contentType === 'image/jpeg' || file.contentType
        === 'image/png') {
        const readStream = gridfsBucket.openDownloadStream(file._id);
        readStream.pipe(res);
    }
    else {
        return res.status(404).json({
            err: 'not an image'
        });
    }

});

// @route GET /download/:filename
// @desc download single file object
app.get('/download/:id', async (req, res) => {

    const obj_id = new mongoose.Types.ObjectId(req.params.id);
    const files = await gridfsBucket.find({ "_id": obj_id }).toArray();
    if (files.length === 0) {
        return res.status(404).json({
            err: 'no files exists'
        });
    }

    const file = files[0];

    //check if image

    const readStream = await gridfsBucket.openDownloadStream(file._id);

    readStream.pipe(fs.createWriteStream(`./${file.filename}`))
        .on('error', function (error) {
            return res.status(404).json({
                err: error
            });
        })
        .on('finish', function () {
            res.download(file.filename)
            console.log(`Downloaded ${file.filename}`)
            setTimeout(removeFile, 1200)
        });

        function removeFile() {
            fs.access(file.filename, function(err) {
              if (err) {
                console.log(err)
              }
              else {
                fs.unlinkSync(file.filename)
              }
            })
          }
});

// @route DELTE /files/:id
// @desc delete file
app.delete('/files/:id', (req, res) => {

    const obj_id = new mongoose.Types.ObjectId(req.params.id);
    gridfsBucket.delete(obj_id);

    res.json({
        message: "La imagen ha sido eliminada",
        status: true
    });
})

app.listen(4010., () => console.log('server started on port 4010'));