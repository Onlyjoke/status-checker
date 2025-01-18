const axios = require('axios');
const cheerio = require('cheerio');
const { Telegraf } = require('telegraf');
const fs = require('fs');
require('dotenv').config();

// Configuration
const URL = process.env.URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const STATUS_FILE = 'status.json';
const formDataParams = {
  nummer: 'B020SD59301',
  art: 'AFE',
};

const headers = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
};

// Initialize Telegram bot
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Function to send a Telegram notification
async function sendNotification(message) {
  try {
    await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message);
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
}

// Function to fetch status
async function fetchStatus() {
  const formData = new URLSearchParams();
  Object.entries(formDataParams).forEach(([key, value]) => {
    formData.append(key, value);
  });

  try {
    const response = await axios.post(URL, formData, { headers });

    const $ = cheerio.load(response.data);
    const statusText = $('body').text();
    const match = statusText.match(/Führerscheinherstellung in Auftrag gegeben am \d{2}\.\d{2}\.\d{4}/);

    return match ? match[0] : null;
  } catch (error) {
    console.error('Error fetching status:', error);
    return null;
  }
}

// Function to check and notify on status change
async function checkStatus() {
  console.log('Checking status...');

  const newStatus = await fetchStatus();
  if (!newStatus) {
    console.log('No valid status found.');
    return;
  }

  let previousStatus = null;
  if (fs.existsSync(STATUS_FILE)) {
    previousStatus = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  }

  if (newStatus !== previousStatus) {
    console.log('Status changed! Sending notification...');
    await sendNotification(`Status has changed! New status: \n${newStatus}`);
    fs.writeFileSync(STATUS_FILE, JSON.stringify(newStatus, null, 2));
  } else {
    await sendNotification(`Status has not changed :(`);
    console.log('No changes in status.');
  }
}

// Execute the status check
checkStatus();
