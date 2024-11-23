const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/RoxiSystem',{
    
});

const db = mongoose.connection;
db.on('error',console.error.bind(console,'Connection error:'));
db.once('open',()=>{
    console.log('Connected to mongodb');
});

db.on('disconnected', () => {
    console.log('Disconnected from MongoDB');
});

const productSearchSchema = new mongoose.Schema({
    id:Number,
    title:String,
    price:Number,
    description:String,
    category:String,
    image:String,
    sold:Boolean,
    dateOfSale:Date,
});


const ProductS = mongoose.model('ProductS',productSearchSchema);

//initalize data
app.get('/initializeS',async(req,res)=> {
    try{
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const Products = response.data;

        await ProductS.deleteMany({});

        await ProductS.insertMany(Products);

        res.status(200).send({ message: 'Database initialized with seed data' });
    } catch(error){
        console.error('Error initializing database:', error);
    res.status(500).send({ message: 'Failed to initialize database', error: error.message });
    }
});

//get all Transactions

app.get('/alltransactions',async(req,res)=>{
    try{
        const {search='',page=1,perPage=10} = req.query;

        const query={};
        if(search){
            query.$or = [
                {title:{$regex:search,$options:'i'}},
                {description:{$regex:search,$options:'i'}},
                {price:{$regex:`^${search}`,$options:'i'}},
            ];
        }
        const pageNumber = parseInt(page,10) || 1;
        const itemsPerPage = parseInt(perPage,10) || 10;
        const skip = (pageNumber-1)*itemsPerPage;

        const [data,totalCount] = await Promise.all([
            ProductS.find(query).skip(skip).limit(itemsPerPage),
            ProductS.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalCount/itemsPerPage);

        res.status(200).send({
            page:pageNumber,
            perPage:itemsPerPage,
            totalPages,
            totalRecords:totalCount,data,
        });
    } catch(error){
        console.error('Error fetching transactions:', error);
        res.status(500).send({ message: 'Failed to fetch transactions', error: error.message });
    }
});

const PORT = 3002;
app.listen(PORT,()=>{
    console.log(`Server is running on http://localhost:${PORT}`);
});

//get statistics

app.get('/statistic',async (req,res)=>{
    try{
        const{month}= req.query;

        if(!month){
            return res.status(400).send({message:'Month is required'});
        }

        const selectedMonth = parseInt(month,10);

        if(isNaN(selectedMonth) || selectedMonth<1 || selectedMonth>12){
            return res.status(400).send({message:'Invalid month provided'});
        }

        const startDate = new Date(selectedMonth,1);
        const endDate = new Date(selectedMonth,0);

        const transactions = await ProductS.find({
            date:{$gte:startDate,$lte:endDate},
        });

        const totalSaleAmount = transactions
      .filter((t) => t.sold)
      .reduce((sum, t) => sum + t.price, 0);

      const totalSoldItems = transactions.filter((t) => t.sold).length;

    const totalNotSoldItems = transactions.filter((t) => !t.sold).length;

    res.status(200).send({
        month: selectedMonth,
        totalSaleAmount,
        totalSoldItems,
        totalNotSoldItems,
      });
    }catch(error){
        console.error('Error fetching statistics:', error);
        res.status(500).send({ message: 'Failed to fetch statistics', error: error.message });
    }
});

//bar-chart Api

app.get('/barchart',async(req,res)=>{
try{
    const {month} = req.query;

    if(!month){
        return res.status(400).send({message:'Month is required'});
    }

    const selectedMonth = parseInt(month,10);
    if (isNaN(selectedMonth) || selectedMonth < 1 || selectedMonth > 12) {
        return res.status(400).send({ message: 'Invalid month provided' });
      }
    
      const priceRange = [
        {label:'0-100',min:0,max:100},
        { label: '101-200', min: 101, max: 200 },
      { label: '201-300', min: 201, max: 300 },
      { label: '301-400', min: 301, max: 400 },
      { label: '401-500', min: 401, max: 500 },
      { label: '501-600', min: 501, max: 600 },
      { label: '601-700', min: 601, max: 700 },
      { label: '701-800', min: 701, max: 800 },
      { label: '801-900', min: 801, max: 900 },
      { label: '901-above', min: 901 },
      ];

      const transactions = await ProductS.find({
        $expr: { $eq: [{ $month: '$date' }, selectedMonth] },
      });

      const rangeCounts = priceRange.map((range) => {
        const count = transactions.filter((t) => {
          if (range.max) {
            return t.price >= range.min && t.price <= range.max;
          }
          return t.price >= range.min;
        }).length;
        return { range: range.label, count };
      });
      res.status(200).send(rangeCounts);  
} catch(error){
    console.error('Error fetching bar chart data:', error);
    res.status(500).send({ message: 'Failed to fetch bar chart data', error: error.message });
}
});

//Pie-chart api

app.get('/piechart',async(req,res)=>{
    try{
        const {month}=req.query;
        if(!month){
            return res.status(400).send({message:'Month is required'});
        }

        const selectedMonth = parseInt(month, 10);
    if (isNaN(selectedMonth) || selectedMonth < 1 || selectedMonth > 12) {
      return res.status(400).send({ message: 'Invalid month provided' });
    }
    const categories = await ProductS.aggregate([
        {
            $match: {
              $expr: { $eq: [{ $month: '$date' }, selectedMonth] },
            },
        },
        {
            $group: {
              _id: '$category', 
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              category: '$_id',
              count: 1,
              _id: 0,
            },
          },
        ]);
        res.status(200).send(categories);
    }catch(error){
        console.error('Error fetching pie chart data:', error);
    res.status(500).send({ message: 'Failed to fetch pie chart data', error: error.message });
    }
});

//combined response Api

app.get('/combinedData',async(req,res)=>{
    try{
        const {month} = req.query;

        if(!month){
            return res.status(400).send({ message: 'Month and year are required' });
        }

        const [statistic,barchart,piechart]=await Promise.all([
            axios.get(`http://localhost:3000/alltransactions`,{params:{month}}),
            axios.get(`http://localhost:3000/statistic`,{params:{month}}),
            axios.get(`http://localhost:3000/barchart`,{params:{month}}),
            axios.get(`http://localhost:3000/piechart`,{params:{month}}),
        ]);

        const combineRes = {
            statistics:statistic.data,
            barChart:barchart.data,
            pieChart:piechart.data,
        };
        res.status(200).send(combineRes);
    } catch(error){
        console.error('Error fetching combined data:', error);
    res.status(500).send({ message: 'Failed to fetch combined data', error: error.message });
    }
});
