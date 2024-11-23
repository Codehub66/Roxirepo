 import './App.css';
 import React from 'react';
 import { useState,useEffect } from 'react';
 import axios from 'axios';
 import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

 const App = () => {
  const [month, setMonth] = useState(3); // Default: March
  const [searchText, setSearchText] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [soldItems, setSoldItems] = useState(0);
  const [notSoldItems, setNotSoldItems] = useState(0);

  const [barChartData, setBarChartData] = useState({ labels: [], datasets: [] });

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  // Fetch transactions from API
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:3002/alltransactions", {
        params: {
          month,
          search: searchText,
          page,
          perPage:10, 
        },
      });
      setTransactions(response.data.transactions);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get("http://localhost:3002/statistic", {
        params: {
          month,
        },
      });
      setTotalSales(response.data.totalSalesAmount);
      setSoldItems(response.data.totalSoldItems);
      setNotSoldItems(response.data.totalNotSoldItems);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const fetchBarChartData = async () => {
    try {
      const response = await axios.get("http://localhost:3000/barchart", {
        params: {
          month,
        },
      });
      const data = response.data;

      setBarChartData({
        labels: Object.keys(data),
        datasets: [
          {
            label: "Number of Items",
            data: Object.values(data),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      });
    } catch (error) {
      console.error("Error fetching bar chart data:", error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchStatistics();
    fetchBarChartData();
  }, [month, searchText, page]);

  return (
    <div className="transactions-container">
      <h1>Transactions</h1>

      
      <div className="filters">
        <select
          value={month}
          onChange={(e) => {
            setMonth(Number(e.target.value));
            setPage(1); 
          }}
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search transactions..."
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setPage(1); 
          }}
        />
      </div>

      <div className="statistics">
        <div className="stat-box">
          <h3>Total Sales Amount</h3>
          <p>${totalSales}</p>
        </div>
        <div className="stat-box">
          <h3>Total Sold Items</h3>
          <p>{soldItems}</p>
        </div>
        <div className="stat-box">
          <h3>Total Not Sold Items</h3>
          <p>{notSoldItems}</p>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="transactions-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Price</th>
              <th>Sold</th>
              <th>dateOfSale</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.id}</td>
                  <td>{transaction.title}</td>
                  <td>{transaction.description}</td>
                  <td>${transaction.price}</td>
                  <td>{transaction.sold ? "Yes" : "No"}</td>
                  <td>{new Date(transaction.dateOfSale).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No transactions found</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

       <div className="chart-container">
        <h2>Price Range Distribution</h2>
        <Bar
          data={barChartData}
          options={{
            responsive: true,
            plugins: {
              legend: { position: "top" },
              title: { display: true, text: "Number of Items in Price Ranges" },
            },
          }}
        />
      </div>

      {/* Pagination Controls */}
      <div className="pagination">
        <button onClick={() => setPage(page - 1)} disabled={page === 1}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button onClick={() => setPage(page + 1)} disabled={page === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
};

export default App;